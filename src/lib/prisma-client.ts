/**
 * Shared Prisma client factory (app runtime + seed script).
 * Neon / any PostgreSQL via `@prisma/adapter-pg`.
 */
import { PrismaPg } from "@prisma/adapter-pg";
// Relative import so prisma/seed.ts (bun) and Next both resolve cleanly.
import { PrismaClient } from "../generated/prisma/client";

export function createPrismaClient(connectionString?: string) {
  const url =
    connectionString ??
    process.env.DATABASE_URL ??
    process.env.POSTGRES_URL ??
    process.env.POSTGRES_PRISMA_URL;

  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Use a Neon (or other PostgreSQL) connection string.\n" +
        "Example: postgresql://user:pass@ep-xxx.region.aws.neon.tech/neondb?sslmode=require",
    );
  }

  if (url.startsWith("file:") || url.startsWith("libsql:")) {
    throw new Error(
      "This build uses PostgreSQL (Neon). DATABASE_URL must be a postgres:// or postgresql:// URL, not SQLite/libsql.",
    );
  }

  const adapter = new PrismaPg({ connectionString: url });
  return new PrismaClient({ adapter });
}
