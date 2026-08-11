import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * Unit tests are pure (no HTTP, no database) so they run in the Node
 * environment against the source modules directly. Integration/security
 * suites that need a database will use a dedicated test DB (docs/06-testing-plan.md §1).
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
