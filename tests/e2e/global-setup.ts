import { execSync } from "node:child_process";
import { rmSync } from "node:fs";
import { APP_DIR, TEST_DB_URL, TEST_DIST_DIR } from "./constants";

/**
 * Runs once before the webServer starts: create the test database schema and
 * load the canonical demo seed. Individual spec files reseed themselves in
 * beforeAll so each file starts from a known state.
 */
export default function globalSetup() {
  // A dev server killed mid-run (or an interrupted suite) leaves a half-written
  // Turbopack cache in .next-e2e - the next run then serves 404s for routes
  // that exist and stale revalidations. Always build fresh.
  rmSync(`${APP_DIR}/${TEST_DIST_DIR}`, { recursive: true, force: true });

  const env = { ...process.env, DATABASE_URL: TEST_DB_URL };
  execSync("bun x prisma db push", { cwd: APP_DIR, env, stdio: "inherit" });
  execSync("bun x prisma db seed", { cwd: APP_DIR, env, stdio: "inherit" });
  console.log("[e2e] test dist cache cleared; database pushed + seeded");
}
