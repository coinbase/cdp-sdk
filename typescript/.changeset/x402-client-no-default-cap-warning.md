---
"@coinbase/cdp-sdk": patch
---

`CdpX402Client` now emits a `console.warn` on construction when no `spendControls.maxAmountPerPayment` is configured. Unlike upstream `x402Client` (which defaults to a $1 per-payment cap), `CdpX402Client` disables that upstream default and applies no per-payment cap of its own unless one is set via `spendControls`. Without an explicit cap, a malicious or misconfigured resource server can request an arbitrarily large payment and the client will sign it — set `spendControls: { maxAmountPerPayment: { atomic: ..., asset: ... } }` to bound payment size. If you're migrating code that relied on upstream's default $1 cap, add this explicitly; it is not preserved.
