---
"@coinbase/cdp-sdk": minor
---

Bump the `@x402/core`, `@x402/evm`, `@x402/extensions`, and `@x402/svm` peer dependencies to `^2.19.0`, rework `CdpX402Client`'s network/RPC configuration, and add client-side `batch-settlement` scheme support.

- `CdpX402Client`'s `rpcUrls` config option and the `CDP_X402_RPC_URLS` env var are replaced by
  `networkSchemes`, which configures a network's RPC URL and enabled schemes (`exact`/`upto`/`batchSettlement`)
  together. A new `environment` option (`"production"` default / `"development"`, falls back to
  `CDP_X402_CLIENT_ENVIRONMENT`) controls whether Base mainnet or Base Sepolia is prescribed by default.
  If you were setting `rpcUrls` or `CDP_X402_RPC_URLS`, switch to `networkSchemes[].rpcUrl`.
- `createX402Server`'s `batch-settlement` scheme support (and the `getCdpBatchSettlementScheme` helper)
  is temporarily removed: it registered the scheme but never ran the channel-manager settle lifecycle,
  so a client's payment could be accepted without the receiver actually getting paid. Client-side
  `CdpX402Client` `batch-settlement` support is unaffected. Re-enabling the server side is planned once
  that lifecycle is implemented.
