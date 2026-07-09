---
"@coinbase/cdp-sdk": minor
---

Added first-class x402 payment protocol support. Introduced the `@coinbase/cdp-sdk/x402` subpath exporting `CdpX402Client` for paying x402-protected APIs with CDP-managed wallets, `createX402Server` for gating HTTP endpoints, `createCdpFacilitatorClient` for the CDP-hosted facilitator, SDK-managed spend controls, and CDP-account-to-x402 signer adapters. Added a `signX402Payment` action to CDP EVM server accounts, EVM smart accounts, and Solana accounts for signing x402 payment payloads directly.
