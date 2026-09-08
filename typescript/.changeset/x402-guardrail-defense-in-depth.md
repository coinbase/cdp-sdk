---
"@coinbase/cdp-sdk": patch
---

Hardened x402 spend control guardrails: a `PaymentRequirements` object carrying both `amount` (v2) and `maxAmountRequired` (v1) is now rejected outright as malformed instead of selecting one field, each requirement is validated against the version-specific `@x402/core/schemas` shape before its amount is read, and `maxTimeoutSeconds` is bounded against a server-independent ceiling before it can influence a signed authorization's validity window.
