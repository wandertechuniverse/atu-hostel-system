import { defineConfig } from "@playwright/test";
import { APP_DIR, BASE_URL, TEST_DB_URL, TEST_DIST_DIR, E2E_PORT } from "./tests/e2e/constants";

export default defineConfig({
  testDir: "./tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  fullyParallel: false,
  workers: 1,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: [["list"]],
  use: {
    baseURL: BASE_URL,
    viewport: { width: 1280, height: 800 },
    trace: "retain-on-failure",
  },
  webServer: {
    command: `bun run dev -- --port ${E2E_PORT}`,
    cwd: APP_DIR,
    url: BASE_URL,
    reuseExistingServer: false,
    timeout: 180_000,
    env: {
      ...process.env,
      // Neutralise any ambient PORT and pin the test server + database.
      PORT: String(E2E_PORT),
      DATABASE_URL: TEST_DB_URL,
      NEXT_DIST_DIR: TEST_DIST_DIR,
    },
  },
});
