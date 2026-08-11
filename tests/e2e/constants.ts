import path from "node:path";

/** Root of the Next.js app (atu-hostel-system). */
export const APP_DIR = path.resolve(__dirname, "../..");

/**
 * Dedicated e2e database. Resolved relative to the app root (cwd) by both the
 * Prisma CLI (via prisma.config.ts) and the runtime libsql adapter - the same
 * pattern the run doc proves for dev.db.
 */
export const TEST_DB_URL = "file:./test.db";

/** The e2e dev server never touches the preview server's .next cache. */
export const TEST_DIST_DIR = ".next-e2e";

export const E2E_PORT = 3100;
export const BASE_URL = `http://127.0.0.1:${E2E_PORT}`;
