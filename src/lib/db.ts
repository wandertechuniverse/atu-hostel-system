import { copyFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function isServerless() {
  return Boolean(
    process.env.NETLIFY ||
      process.env.AWS_LAMBDA_FUNCTION_NAME ||
      process.env.LAMBDA_TASK_ROOT,
  );
}

/** Locate the build-time demo DB even when the function cwd differs. */
function findDemoDb(): string | null {
  const candidates = [
    join(process.cwd(), "prisma", "demo.seed.db"),
    join(process.cwd(), "data", "demo.db"),
    join(process.cwd(), "..", "prisma", "demo.seed.db"),
    join(process.cwd(), "..", "data", "demo.db"),
    join(__dirname, "..", "..", "prisma", "demo.seed.db"),
    join(__dirname, "..", "..", "data", "demo.db"),
    join(__dirname, "..", "prisma", "demo.seed.db"),
    join(__dirname, "..", "data", "demo.db"),
  ];
  for (const p of candidates) {
    if (existsSync(p)) return p;
  }
  try {
    const root = process.cwd();
    for (const name of ["prisma", "data"]) {
      const p = join(root, name, name === "prisma" ? "demo.seed.db" : "demo.db");
      if (existsSync(p)) return p;
    }
    for (const name of readdirSync(root)) {
      const p = join(root, name, "demo.seed.db");
      if (existsSync(p)) return p;
    }
  } catch {
    // ignore
  }
  return null;
}

/**
 * Resolve the database URL for this process.
 *
 * Priority:
 * 1. Remote libSQL/Turso (`libsql://` / `https://`) — durable production
 * 2. Explicit DATABASE_URL (local file:./dev.db)
 * 3. Serverless fallback: copy build-time `data/demo.db` into `/tmp`
 */
function resolveDatabaseUrl(): string {
  const configured = process.env.DATABASE_URL;
  if (
    configured &&
    (configured.startsWith("libsql://") ||
      configured.startsWith("https://") ||
      configured.startsWith("http://"))
  ) {
    return configured;
  }
  if (configured && !isServerless()) {
    return configured;
  }

  if (isServerless()) {
    const tmp = "/tmp/hbms.db";
    const seed = findDemoDb();
    if (!existsSync(tmp) && seed) {
      try {
        copyFileSync(seed, tmp);
        console.info("[db] seeded /tmp/hbms.db from", seed);
      } catch (error) {
        console.error("[db] failed to copy demo.db to /tmp:", error);
      }
    } else if (!existsSync(tmp) && !seed) {
      console.warn(
        "[db] no demo.db in function bundle — login will auto-seed empty accounts",
      );
    }
    return `file:${tmp}`;
  }

  return configured ?? "file:./dev.db";
}

function createClient() {
  const url = resolveDatabaseUrl();
  const authToken = process.env.LIBSQL_AUTH_TOKEN ?? process.env.TURSO_AUTH_TOKEN;
  const adapter = new PrismaLibSql(authToken ? { url, authToken } : { url });
  return new PrismaClient({ adapter });
}

export const db = globalForPrisma.prisma ?? createClient();

// Cache the client in every environment so serverless reuse keeps the
// connection (and the /tmp file handle) warm across invocations.
globalForPrisma.prisma = db;
