import {
  createPrismaClient,
  resetDbPool,
} from "@/lib/prisma-client";
import type { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function getPrisma(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient();
  }
  return globalForPrisma.prisma;
}

/**
 * Application database client.
 *
 * Production (Netlify) and local both use **Neon PostgreSQL** (or any Postgres)
 * via DATABASE_URL. See `.env.example` and `docs/13-deployment.md`.
 *
 * Implemented as a Proxy so pool/client reset (after Neon idle kills) can swap
 * the underlying PrismaClient without every import going stale.
 */
export const db: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = getPrisma();
    const value = Reflect.get(client, prop, receiver);
    return typeof value === "function"
      ? (value as (...args: unknown[]) => unknown).bind(client)
      : value;
  },
});

/**
 * Drop the pg pool and rebuild Prisma after a connection drop so the next
 * query does not use a terminated socket.
 */
export async function resetDbClient(): Promise<void> {
  const prev = globalForPrisma.prisma;
  globalForPrisma.prisma = undefined;
  if (prev) {
    await prev.$disconnect().catch(() => undefined);
  }
  await resetDbPool();
  globalForPrisma.prisma = createPrismaClient();
}
