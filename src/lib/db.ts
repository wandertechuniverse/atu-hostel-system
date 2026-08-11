import { createPrismaClient } from "@/lib/prisma-client";
import type { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

/**
 * Application database client.
 *
 * Production (Netlify) and local both use **Neon PostgreSQL** (or any Postgres)
 * via DATABASE_URL. See `.env.example` and `docs/13-deployment.md`.
 */
export const db = globalForPrisma.prisma ?? createPrismaClient();

globalForPrisma.prisma = db;
