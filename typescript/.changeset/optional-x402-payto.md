---
"@coinbase/cdp-sdk": patch
---

Made `payTo` optional on the full x402 route format accepted by `createX402Server`, and added an optional `paymentFlow` shorthand on simplified routes (`"authorization"` | `"upfront"`, exact-scheme only) that is applied to every network the route expands to.
