import { defineConfig } from "vitest/config";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      // Resolve CDP x402 packages directly from TypeScript source so no build step is needed.
      "@coinbase/x402/server": fileURLToPath(
        new URL("../src/core/server/index.ts", import.meta.url),
      ),
      "@coinbase/x402": fileURLToPath(
        new URL("../src/index.ts", import.meta.url),
      ),
      "@coinbase/x402-express": fileURLToPath(
        new URL("../../x402-express/src/index.ts", import.meta.url),
      ),
      "@coinbase/x402-hono": fileURLToPath(
        new URL("../../x402-hono/src/index.ts", import.meta.url),
      ),
      "@coinbase/x402-next/server": fileURLToPath(
        new URL("../../x402-next/src/server.ts", import.meta.url),
      ),
      "@coinbase/x402-next": fileURLToPath(
        new URL("../../x402-next/src/index.ts", import.meta.url),
      ),
      // Shim next/server so @x402/next can be loaded without a full Next.js
      // install. next@16.x has no exports map, so bare "next/server" fails
      // under Node.js strict-ESM. The shim provides the minimal surface that
      // @x402/next uses at runtime (NextRequest + NextResponse).
      "next/server": fileURLToPath(new URL("./mocks/next-server.ts", import.meta.url)),
    },
  },
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["./vitest.setup.ts"],
    include: ["**/*.e2e.test.ts"],
    testTimeout: 120_000, // 2 minutes — network calls to CDP can be slow
    hookTimeout: 60_000, // beforeAll/afterAll must provision wallets and start servers
    // Run test files sequentially so both suites don't race to bind the same port.
    fileParallelism: false,
    server: {
      deps: {
        // Force @x402/next through vite's transform pipeline so the resolve
        // aliases above (including "next/server") apply to its internal imports.
        inline: ["@x402/next"],
      },
    },
  },
});
