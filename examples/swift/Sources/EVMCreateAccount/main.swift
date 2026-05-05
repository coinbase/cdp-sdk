// Usage: swift run EVMCreateAccount
// Requires: CDP_API_KEY_ID, CDP_API_KEY_SECRET env vars

import CDPSDK

let cdp = try CdpClient()

let account = try await cdp.evm.createAccount()
print("Successfully created EVM account: \(account.address)")
