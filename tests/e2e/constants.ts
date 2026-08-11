import path from "node:path";

/** Root of the Next.js app (atu-hostel-system). */
export const APP_DIR = path.resolve(__dirname, "../..");

/**
 * Dedicated e2e database (PostgreSQL / Neon).
 * Prefer E2E_DATABASE_URL so tests do not wipe your main Neon DB; falls back
 * to DATABASE_URL from the environment / .env.
 */
export const TEST_DB_URL =
  process.env.E2E_DATABASE_URL ??
  process.env.DATABASE_URL ??
  "postgresql://neondb_owner:password@localhost:5432/neondb?sslmode=require";

/** The e2e dev server never touches the preview server's .next cache. */
export const TEST_DIST_DIR = ".next-e2e";

export const E2E_PORT = 3100;
export const BASE_URL = `http://127.0.0.1:${E2E_PORT}`;
