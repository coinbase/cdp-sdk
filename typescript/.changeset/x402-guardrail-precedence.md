---
"@coinbase/cdp-sdk": patch
---

Fixed x402 spend control guardrails to select the amount field by negotiated protocol version instead of field presence, and to always confirm (never roll back) provisional spend once a payment response is observed, since a self-reported settlement failure is not a trustworthy signal once the payment authorization has already been transmitted.
