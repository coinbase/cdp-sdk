---
"@coinbase/cdp-sdk": patch
---

Fixed the swap execute path (`sendSwapTransaction` and `sendSwapOperation`) to fail closed on balance issues before broadcasting a swap transaction, not just allowance issues. `simulationIncomplete` is deliberately not treated as a blocking issue since, per the API docs, it does not necessarily mean the trade will revert.
