import { defineConfig } from "vitest/config";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      // Shim next/server so @x402/next can load without a full Next.js install.
      // next@16.x has no exports map, so the bare "next/server" specifier fails
      // under Node.js strict-ESM. The shim provides the minimal surface that
      // @x402/next uses at runtime (NextRequest + NextResponse).
      "next/server": fileURLToPath(
        new URL("./src/x402/test-helpers/next-server.ts", import.meta.url),
      ),
    },
  },
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
    hookTimeout: 60000,
    fileParallelism: false,
    server: {
      deps: {
        // Force @x402/next through Vite's transform pipeline so the
        // "next/server" alias above applies to its internal imports.
        inline: ["@x402/next"],
      },
    },
  },
});
