import path from "node:path";
import type { NextConfig } from "next";

// `@coinbase/cdp-sdk` is a workspace package that lives outside this pnpm
// workspace (`examples/typescript`) entirely — it's in the sibling
// `typescript/` workspace, two levels up from the repo root. Turbopack
// infers its project root from the nearest lockfile (`examples/typescript`)
// and refuses to resolve imports outside of it, so point it at the actual
// repo root explicitly.
// See: https://nextjs.org/docs/app/api-reference/config/next-config-js/turbopack#root-directory
const repoRoot = path.join(__dirname, "../../../../..");

const nextConfig: NextConfig = {
  outputFileTracingRoot: repoRoot,
  turbopack: {
    root: repoRoot,
  },
};

export default nextConfig;
