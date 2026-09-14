---
"@coinbase/cdp-sdk": minor
---

Bumped the `@x402/core`, `@x402/evm`, `@x402/extensions`, and `@x402/svm` peer dependencies to `^2.25.0`, and added `upto` (usage-based billing) support to `createX402Server` on Solana. `upto` was previously EVM-only server-side because the resource server had to sign an arbitrary-bytes settlement voucher. `@x402/svm@2.25.0` makes the voucher-signing key optional, so `createX402Server` delegates the payment channel's `authorized_signer` role to the CDP Facilitator.

As a result, a simplified route with `scheme: "upto"` and no explicit `networks` now expands to Base **and** Solana (previously Base only), matching `scheme: "exact"`, and `getCdpDefaultSchemes()` returns four registrations instead of three. Routes that should stay EVM-only need an explicit `networks` list. `upto` on a Solana network is also no longer rejected when requested explicitly, in either the simplified or the full x402 route format.

This requires a CDP Facilitator that advertises a `receiverAuthorizer` for `upto` on `solana:*`.
