---
"@coinbase/cdp-sdk": minor
---

Added first-class x402 payment protocol support. Introduced the `@coinbase/cdp-sdk/x402` subpath exporting `CdpX402Client` for paying x402-protected APIs with CDP-managed wallets, `createX402Server` for gating HTTP endpoints, `createCdpFacilitatorClient` for the CDP-hosted facilitator, SDK-managed spend controls, and CDP-account-to-x402 signer adapters. Added a `signX402Payment` action to CDP EVM server accounts, EVM smart accounts, and Solana accounts for signing x402 payment payloads directly.

The `@x402/core`, `@x402/evm`, `@x402/extensions`, and `@x402/svm` packages are optional peer dependencies rather than regular dependencies, so installing `@coinbase/cdp-sdk` doesn't pull them in unless you use x402 functionality. Install them yourself (e.g. `npm install @x402/core @x402/evm @x402/svm`) to use `signX402Payment`, `@coinbase/cdp-sdk/x402`, or the x402 examples.
