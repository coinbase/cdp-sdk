---
name: bump-x402-dependencies
description: >-
  Bumps every @x402/* package (the optional peer dependencies in the CDP
  TypeScript SDK, the pinned dev dependencies used to test the SDK against
  x402, and the dependencies in every TypeScript x402 example) to the latest
  lockstep-released version, then verifies the SDK and all examples still
  build, lint, format, and typecheck. Use when the user asks to bump, update,
  or sync x402 (or @x402) dependencies/peer dependencies in cdp-sdk, or when a
  new x402 release needs to be picked up across the repo.
---

# Bump x402 Dependencies

## Background

- `@x402/*` packages (`core`, `evm`, `extensions`, `svm`, `axios`, `fetch`,
  `mcp`, `express`, `hono`, `next`) are released in lockstep: every package
  publishes the same version number at the same time, always as `X.Y.0`.
- `typescript/packages/cdp-sdk/package.json` declares `core`/`evm`/`extensions`/`svm`
  as **optional peerDependencies**, pinned with `^X.Y.0`.
- `typescript/package.json` pins the same four packages plus `fetch` as
  **exact-version devDependencies** (no `^`) so the SDK's own test suite runs
  against a known x402 version.
- Every TypeScript x402 example depends on the subset of `@x402/*` packages it
  needs, pinned with `^X.Y.0`:
  `examples/typescript/package.json` (client examples) and each
  `examples/typescript/x402/servers/{express,hono,mcp,next}/package.json`.
- **Why this matters:** if these drift out of sync (e.g. `extensions` at
  `^2.17.0` while everything else is `^2.16.0`), pnpm can install two copies of
  a package at different versions. TypeScript then treats their exported
  classes as structurally incompatible, producing errors like
  `Types have separate declarations of a private property 'xyz'` in examples
  that mix a CDP-provided type with an `@x402/*` type. Keeping every
  occurrence on the same version avoids/fixes this class of bug.

## Steps

1. **Resolve the target version.** Don't guess — always resolve it fresh, since
   this skill is re-run every time x402 publishes a new release:

   ```bash
   npm view @x402/core dist-tags.latest
   ```

   Cross-check 2-3 other `@x402/*` packages actually in use (e.g. `@x402/evm`,
   `@x402/extensions`) resolve to the *same* version. If they don't match, stop
   and ask the user which version to target — the lockstep assumption doesn't
   hold and blindly bumping could mix incompatible versions.

2. **Find every occurrence.** Run:

   ```bash
   grep -rn '"@x402/' --include=package.json typescript examples 2>/dev/null | grep -v node_modules
   ```

   As of writing, this covers exactly these files/keys — but always trust the
   grep output over this list, since new examples may have been added since:

   | File | Field | Prefix |
   |---|---|---|
   | `typescript/packages/cdp-sdk/package.json` | `peerDependencies`: core, evm, extensions, svm | `^` |
   | `typescript/package.json` | `devDependencies`: core, evm, extensions, fetch, svm | exact (no `^`) |
   | `examples/typescript/package.json` | `dependencies`: axios, core, evm, fetch, mcp, svm | `^` |
   | `examples/typescript/x402/servers/express/package.json` | `dependencies`: core, evm, express, extensions, svm | `^` |
   | `examples/typescript/x402/servers/hono/package.json` | `dependencies`: core, evm, extensions, hono, svm | `^` |
   | `examples/typescript/x402/servers/mcp/package.json` | `dependencies`: core, evm, mcp | `^` |
   | `examples/typescript/x402/servers/next/package.json` | `dependencies`: core, evm, extensions, next, svm | `^` |

3. **Edit each occurrence.** Replace only the version number in each
   `"@x402/<pkg>": "..."` entry and preserve whatever prefix was already there
   (`^` vs. exact). Never touch unrelated dependencies, and never add `@x402/*`
   packages to a file that didn't already depend on them.

4. **Regenerate lockfiles** (non-frozen install; this is expected to modify
   both lockfiles):

   ```bash
   cd typescript && pnpm install
   cd ../examples/typescript && pnpm install
   ```

5. **Regression-check the SDK:**

   ```bash
   cd typescript
   pnpm build
   pnpm lint
   pnpm format:check
   ```

6. **Regression-check the examples:**

   ```bash
   cd examples/typescript
   pnpm build   # typechecks root examples (evm/, solana/, quickstart/, x402/clients/, etc.)
   ```

   The root `tsconfig.json` excludes `x402/servers`, so each server workspace
   has its own `tsconfig.json`. `express`, `hono`, and `mcp` have a
   `"build": "tsc"` script; `next` has a `"typecheck": "tsc --noEmit"` script
   (its `"build"` is `next build`). Run each:

   ```bash
   cd x402/servers/express && pnpm build
   cd ../hono               && pnpm build
   cd ../mcp                && pnpm build
   cd ../next               && pnpm typecheck
   ```

   Type-check `next` rather than `next build` it: a full `next build` collects
   page data, which evaluates the route module and constructs the CDP
   facilitator via `createCdpFacilitatorClient()` — that needs real
   `CDP_API_KEY_ID` / `CDP_API_KEY_SECRET` and makes live CDP API calls, which
   this job (and this skill's local regression check) intentionally avoids —
   `build-examples` runs on every PR touching `typescript`/`examples`, not
   just x402 ones, and shouldn't depend on network/CDP availability. `tsc
   --noEmit` catches the same type and dependency-version errors without
   executing module code, and it's what the `build-examples` CI job runs.
   (For reference, a real `next build` also needs `PAY_TO` set and its
   `next.config.ts` sets `turbopack.root` / `outputFileTracingRoot` to the
   repo root so Turbopack can resolve the workspace-linked
   `@coinbase/cdp-sdk` — don't remove that config.)

7. **If any regression check fails**, don't just move on. An error like
   `Types have separate declarations of a private property '...'` means some
   `@x402/*` occurrence still doesn't match the rest — re-run step 2's grep
   and diff versions across all files before investigating further.

8. **Add a changeset if the SDK's peer dependencies changed.** If
   `typescript/packages/cdp-sdk/package.json`'s `peerDependencies` changed,
   add a changeset so the bump shows up in the next `@coinbase/cdp-sdk`
   release notes:

   ```markdown
   ---
   "@coinbase/cdp-sdk": patch
   ---

   Bump the `@x402/core`, `@x402/evm`, `@x402/extensions`, and `@x402/svm` peer dependencies to `^X.Y.0`.
   ```

   Save this as a new file under `typescript/.changeset/` (any descriptive
   filename, e.g. `bump-x402-peer-deps.md`), with `X.Y.0` replaced by the
   actual version. Use `minor`/`major` instead of `patch` if the x402 release
   notes call out breaking changes.

9. **Summarize and stop.** Report old → new version per file and confirm
   every regression check passed. Leave all changes uncommitted for the user
   to review — do not commit or push unless explicitly asked.

## Notes

- Steps 5-6 above (type-check/build only) mirror what CI's `build-examples`
  job runs, and are enough to catch the dependency-version-skew errors this
  skill exists to fix. They don't require CDP credentials, so they're the
  right default when you don't have any configured.
- If you *do* have CDP credentials (`CDP_API_KEY_ID` / `CDP_API_KEY_SECRET` /
  `CDP_WALLET_SECRET`) and a funded testnet wallet, also live-test the example
  servers and clients against each other (`pnpm start` in each server
  directory, then run a client example against it) before considering the
  bump complete. This isn't required by the skill, but it's worth doing: a
  prior x402 bump introduced a runtime-only regression (an MCP server hanging
  on a second concurrent client) that type-checking never caught. CI's E2E
  workflows do have real CDP credentials (a globally-set API key and wallet
  secret — see `.github/workflows/typescript_e2e_test.yml`), so this kind of
  check is reproducible there even without local credentials.
- If a new x402-consuming example is added later, add its `package.json` to
  the table in step 2, give it its own `tsconfig.json` + `"build": "tsc"`
  script (mirroring `express`/`hono`/`mcp`) so it gets type-checked at all,
  wire that build into the `build-examples` CI job, and add its regression
  check to step 6.
