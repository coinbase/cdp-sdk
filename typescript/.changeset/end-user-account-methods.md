---
"@coinbase/cdp-sdk": minor
---

Added convenience methods to the EndUser object for adding accounts. You can now call `endUser.addEvmAccount()`, `endUser.addEvmSmartAccount()`, and `endUser.addSolanaAccount()` directly on the EndUser object instead of using the client methods with userId.
