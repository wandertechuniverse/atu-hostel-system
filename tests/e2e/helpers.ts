import { execSync } from "node:child_process";
import type { Page } from "@playwright/test";
import { DEMO_PASSWORD } from "../../src/lib/demo-accounts";
import { APP_DIR, TEST_DB_URL } from "./constants";

/**
 * Wipe and reload the test database with the canonical seed. Reseeding
 * recreates every row with new ids, so any session opened before the call is
 * invalid - always log in again afterwards.
 */
export function reseed() {
  execSync("bun x prisma db seed", {
    cwd: APP_DIR,
    env: { ...process.env, DATABASE_URL: TEST_DB_URL },
    stdio: "pipe",
  });
}

/** Log in and wait for the role-appropriate landing page. */
export async function login(page: Page, email: string, password = DEMO_PASSWORD) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await page.waitForURL(/\/admin$|\/manager$|\/$/);
}
