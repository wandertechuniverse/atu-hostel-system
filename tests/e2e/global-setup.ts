import { execSync } from "node:child_process";
import { APP_DIR, TEST_DB_URL } from "./constants";

/**
 * Runs once before the webServer starts: create the test database schema and
 * load the canonical demo seed. Individual spec files reseed themselves in
 * beforeAll so each file starts from a known state.
 */
export default function globalSetup() {
  // Cache wipe lives in playwright.config webServer.command so Next is not
  // running when .next-e2e is deleted (Windows + Turbopack crash otherwise).
  const env = { ...process.env, DATABASE_URL: TEST_DB_URL };
  execSync("bun x prisma db push", { cwd: APP_DIR, env, stdio: "inherit" });
  execSync("bun x prisma db seed", { cwd: APP_DIR, env, stdio: "inherit" });
  console.log("[e2e] database pushed + seeded");
}
