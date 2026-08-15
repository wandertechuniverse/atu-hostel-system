/**
 * Shared Prisma client factory (app runtime + seed script).
 * Neon / any PostgreSQL via `@prisma/adapter-pg` + a process-wide `pg.Pool`.
 *
 * Local `next dev` prefers DIRECT_URL (non-pooler) when set — the Neon
 * transaction pooler is for serverless; a long-lived dev process is more
 * stable on a direct connection and avoids flaky "Invalid findUnique"
 * connection drops that surface as PrismaClientKnownRequestError.
 */
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
// Relative import so prisma/seed.ts (bun) and Next both resolve cleanly.
import { PrismaClient } from "../generated/prisma/client";
import { normalizePostgresSslMode } from "./postgres-url";

export { normalizePostgresSslMode } from "./postgres-url";

const globalForPool = globalThis as unknown as {
  pgPool?: Pool;
  pgPoolWarm?: Promise<void>;
  pgPoolUrl?: string;
};

function resolveDatabaseUrl(connectionString?: string): string {
  if (connectionString) {
    return normalizePostgresSslMode(connectionString);
  }

  // Dev: direct endpoint when available (more reliable for long-lived next dev).
  // Production / Netlify: always the pooled URL.
  const preferDirect =
    process.env.NODE_ENV !== "production" &&
    process.env.HBMS_USE_POOLER !== "1" &&
    Boolean(process.env.DIRECT_URL?.trim());

  const raw = preferDirect
    ? process.env.DIRECT_URL
    : (process.env.DATABASE_URL ??
      process.env.POSTGRES_URL ??
      process.env.POSTGRES_PRISMA_URL);

  if (!raw?.trim()) {
    throw new Error(
      "DATABASE_URL is not set. Use a Neon (or other PostgreSQL) connection string.\n" +
        "Example: postgresql://user:pass@ep-xxx.region.aws.neon.tech/neondb?sslmode=verify-full",
    );
  }

  if (raw.startsWith("file:") || raw.startsWith("libsql:")) {
    throw new Error(
      "This build uses PostgreSQL (Neon). DATABASE_URL must be a postgres:// or postgresql:// URL, not SQLite/libsql.",
    );
  }

  return normalizePostgresSslMode(raw);
}

/** True for local Prisma Postgres (`prisma dev`) / localhost. */
export function isLocalPostgresUrl(url: string): boolean {
  try {
    const host = new URL(url.replace(/^postgres(ql)?:/i, "http:")).hostname;
    return host === "localhost" || host === "127.0.0.1" || host === "::1";
  } catch {
    return /@localhost\b|@127\.0\.0\.1\b/i.test(url);
  }
}

function createPool(connectionString: string, max: number): Pool {
  const local = isLocalPostgresUrl(connectionString);
  // Prefer startup options over pool.on("connect") + client.query(): a
  // fire-and-forget SET races Prisma's first query on the same client and
  // triggers pg@9 DeprecationWarning ("already executing a query").
  const stmtMs = local ? 30_000 : 12_000;
  const pool = new Pool({
    connectionString,
    max,
    // Recycle before Neon/NAT silently drops the backend (zombies hang queries).
    // Local `prisma dev` accepts one connection at a time — keep idle short.
    idleTimeoutMillis: local ? 1_000 : 10_000,
    // Neon free compute can take several seconds to wake; local is instant.
    connectionTimeoutMillis: local ? 5_000 : 12_000,
    query_timeout: local ? 30_000 : 12_000,
    statement_timeout: stmtMs,
    // libpq startup parameter — applied before any client.query().
    options: `-c statement_timeout=${stmtMs}`,
    allowExitOnIdle: true,
    keepAlive: !local,
    keepAliveInitialDelayMillis: local ? 0 : 5_000,
  });
  pool.on("error", (err) => {
    console.warn("[db] idle pool client error:", err.message);
  });
  return pool;
}

function poolMaxFor(url: string): number {
  // Local Prisma Postgres queues extra connections; use a single client.
  return isLocalPostgresUrl(url) ? 1 : 3;
}

function getPool(connectionString?: string): Pool {
  if (connectionString) {
    const url = resolveDatabaseUrl(connectionString);
    return createPool(url, poolMaxFor(url));
  }

  const url = resolveDatabaseUrl();
  // Recreate pool if URL mode changed (e.g. env swap) or after forced reset.
  if (!globalForPool.pgPool || globalForPool.pgPoolUrl !== url) {
    const prev = globalForPool.pgPool;
    globalForPool.pgPool = createPool(url, poolMaxFor(url));
    globalForPool.pgPoolUrl = url;
    globalForPool.pgPoolWarm = globalForPool.pgPool
      .query("SELECT 1")
      .then(() => undefined)
      .catch((err: unknown) => {
        console.warn("[db] pool warm-up failed:", err);
      });
    if (prev) {
      void prev.end().catch(() => undefined);
    }
    if (process.env.NODE_ENV !== "production") {
      const host = url.match(/@([^/?]+)/)?.[1] ?? "?";
      console.info(`[db] pool → ${host}`);
    }
  }
  return globalForPool.pgPool;
}

/** Await the first successful pool handshake (no-op if already warm). */
export async function ensureDbWarm(): Promise<void> {
  getPool();
  await globalForPool.pgPoolWarm;
}

/**
 * Drop the process-wide pool so the next query opens a fresh TCP connection.
 * Use after "connection terminated" / timeout so retries don't reuse zombies.
 */
export async function resetDbPool(): Promise<void> {
  const prev = globalForPool.pgPool;
  globalForPool.pgPool = undefined;
  globalForPool.pgPoolUrl = undefined;
  globalForPool.pgPoolWarm = undefined;
  if (prev) {
    await prev.end().catch(() => undefined);
  }
  // Recreate immediately so subsequent Prisma ops have a pool.
  getPool();
  await globalForPool.pgPoolWarm;
}

export function createPrismaClient(connectionString?: string) {
  const adapter = new PrismaPg(getPool(connectionString));
  return new PrismaClient({ adapter });
}
