import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.ts", "tests/**/*.integration.test.ts"],
    setupFiles: ["tests/setup.ts"],
    testTimeout: 30_000,
    coverage: {
      reporter: ["text", "lcov"],
    },
  },
});
