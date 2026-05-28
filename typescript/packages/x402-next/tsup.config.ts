import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/server.ts"],
  format: ["cjs", "esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: false,
  treeshake: true,
  external: [
    "@coinbase/x402",
    "@x402/next",
    "@x402/core/server",
    "@x402/evm/exact/server",
    "@x402/evm/upto/server",
    "@x402/svm/exact/server",
    "next",
    "next/server",
  ],
});
