# AGENTS.md

This is the Coinbase Developer Platform (CDP) SDK monorepo: multi-language client
libraries (TypeScript, Python, Go, Rust, and an optional Java SDK) for creating and
using EVM/Solana wallets. There is **no local server** — the SDKs talk to the hosted
CDP API (`api.cdp.coinbase.com`). Per-language dev commands live in `CLAUDE.md`,
`CONTRIBUTING.md`, and each language's `Makefile`/`package.json`.

## Cursor Cloud specific instructions

The update script already installs/refreshes per-language dependencies (TS via `pnpm`,
Python via `uv`, Go modules, Rust via `cargo fetch`). System toolchains (Go 1.24.3,
`uv`, `golangci-lint` v2, `libssl-dev`/`pkg-config`, JDK 21) are pre-provisioned in the
VM snapshot and symlinked into `/usr/local/bin`. Standard build/lint/test commands are
documented in `CLAUDE.md`/`CONTRIBUTING.md`; the notes below are non-obvious caveats.

- **Unit tests run fully offline; E2E tests and `examples/` need real credentials.**
  E2E suites require `CDP_API_KEY_ID`, `CDP_API_KEY_SECRET`, `CDP_WALLET_SECRET` (from
  the CDP Portal). Use the unit-test commands below for verification without creds.
  - TypeScript: `cd typescript && pnpm test` (E2E: `pnpm test:e2e`).
  - Python: `cd python && make test` (already excludes E2E; E2E: `make e2e`).
  - Go: `cd go && make test`.
  - Rust: `cd rust && cargo test --lib` (unit only). **Do not use `make test`/`cargo test`
    without creds** — they include the credential-gated `tests/e2e` integration target,
    which fails with "Missing required CDP API Key ID configuration".

- **Rust unit tests are environment-sensitive to injected `CDP_*` secrets.** The
  `WalletAuth` builder falls back to reading `CDP_WALLET_SECRET`/`CDP_API_KEY` from the
  environment, so a test like `test_wallet_auth_builder_with_required_fields_only`
  (which asserts the wallet secret is `None`) FAILS if those vars are set in the VM.
  Run Rust unit tests with those vars cleared:
  `cd rust && env -u CDP_WALLET_SECRET -u CDP_API_KEY -u CDP_PRIVATE_KEY cargo test --lib`.

- **Go toolchain:** `go.mod` requires Go 1.24.3. The Ubuntu system package (`/usr/bin/go`)
  is older; the snapshot symlinks the newer Go into `/usr/local/bin/go` (takes precedence).

- **Rust build needs OpenSSL headers** (`libssl-dev` + `pkg-config`); already installed
  in the snapshot. First `cargo build` compiles `openssl-sys`/`alloy` and is slow
  (~1–2 min); subsequent builds are cached. Code generation is gated behind `CDP_GENERATE=1`
  (`make generate`); normal dev does NOT regenerate `api.rs` and the build warning about
  it is expected.

- **TypeScript** uses a `pnpm` workspace pinned to `pnpm@10.11.1` via `packageManager`
  (corepack); the SDK package is `typescript/packages/cdp-sdk`. `pnpm install` warns about
  ignored build scripts (esbuild/msw/etc.) — this is expected and build/test still pass.

- **Java SDK (`java/`) is optional** (not listed in the root README's full-featured set).
  It uses the Gradle wrapper (`./gradlew`) with JDK 21; deps resolve on first build.
  `cd java && make test` / `make build` / `make lint` (spotless).

- **Client regeneration tools are optional** and only needed when `openapi.yaml` changes:
  `openapi-generator` 7.11.0 (Python/Go/Java), `orval` (TS), `progenitor` (Rust). Not
  required for normal development.
