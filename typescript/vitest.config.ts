import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts"],
    exclude: ["node_modules", "src/node_modules", "dist", "src/e2e.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["html"],
      exclude: ["node_modules", "dist"],
    },
  },
});
