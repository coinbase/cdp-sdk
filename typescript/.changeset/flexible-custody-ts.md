---
"@coinbase/cdp-sdk": minor
---

Added custodial account support.

`CdpClient` exposes four new namespaces:

- **`client.accounts`** — create, get, and list custodial accounts and their balances
- **`client.depositDestinations`** — create, get, and list deposit destinations for an account
- **`client.paymentMethods`** — get and list payment methods for an account
- **`client.transfers`** — create, get, and list transfers; execute fund transfers and submit deposit travel-rule data
