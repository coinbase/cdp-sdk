import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/e2e.test.ts"],
    exclude: ["node_modules", "dist"],
    coverage: {
      provider: "v8",
      reporter: ["html"],
      exclude: ["node_modules", "dist"],
    },
    testTimeout: 30000,
  },
});
