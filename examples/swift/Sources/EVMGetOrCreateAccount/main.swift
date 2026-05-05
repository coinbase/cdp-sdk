// Usage: swift run EVMGetOrCreateAccount
// Requires: CDP_API_KEY_ID, CDP_API_KEY_SECRET env vars

import CDPSDK

let cdp = try CdpClient()

let account = try await cdp.evm.getOrCreateAccount(name: "MyAccount")
print("Account: \(account.address)")

// Verify idempotency — same name returns the same account
let account2 = try await cdp.evm.getOrCreateAccount(name: "MyAccount")
print("Same address? \(account.address == account2.address)")
