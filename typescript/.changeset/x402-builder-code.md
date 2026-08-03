---
"@coinbase/cdp-sdk": minor
---

Add optional `builderCode` on `CdpX402Client` and `createX402Server` to attach the x402 `builder-code` extension for ERC-8021 on-chain attribution. The client accepts a single service code or an array of them; the server advertises its app code on every route with an EVM payment option. Independently of this option, every `CdpX402Client` and every EVM route on `createX402Server` now also always attaches the SDK's own service code, for attributing on-chain activity to the CDP SDK.
