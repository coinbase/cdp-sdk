/**
 * Global test setup — loads .env files by walking up from the package root
 * to the repository root.
 *
 * This means a .env file placed anywhere in the directory hierarchy (e.g.
 * x402/, typescript/, or the repo root) will be automatically
 * picked up. More specific (deeper) files take precedence over root-level
 * ones because dotenv.config skips already-set variables by default.
 */

import { config } from "dotenv";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function loadEnvUpward(startDir: string): void {
  let dir = startDir;
  // Walk up until we can't go any higher (reached the filesystem root)
  while (true) {
    const candidate = resolve(dir, ".env");
    if (existsSync(candidate)) {
      // override: false means the first (most local) file wins for each var
      config({ path: candidate, override: false, quiet: true });
    }
    const parent = dirname(dir);
    if (parent === dir) break; // reached filesystem root
    dir = parent;
  }
}

loadEnvUpward(packageRoot);
