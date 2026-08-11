import { copyFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

/**
 * Resolve the database URL for this process.
 *
 * Priority:
 * 1. Remote libSQL/Turso (`libsql://` / `https://`) — durable production
 * 2. Explicit DATABASE_URL (local file:./dev.db)
 * 3. Serverless fallback: copy build-time `data/demo.db` into `/tmp` (ephemeral
 *    per instance — fine for demos; use Turso for real persistence)
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
  if (configured && !process.env.NETLIFY && !process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return configured;
  }

  // Serverless ephemeral SQLite (Netlify / Lambda)
  if (process.env.NETLIFY || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    const tmp = "/tmp/hbms.db";
    const seed = join(process.cwd(), "data", "demo.db");
    if (!existsSync(tmp) && existsSync(seed)) {
      copyFileSync(seed, tmp);
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

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
