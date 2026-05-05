// Usage: swift run EVMCreateSmartAccount
// Requires: CDP_API_KEY_ID, CDP_API_KEY_SECRET, CDP_WALLET_SECRET env vars

import CDPSDK

let cdp = try CdpClient()

// Step 1: Create an owner account (server-managed EVM account)
let owner = try await cdp.evm.createAccount()
print("Created owner account: \(owner.address)")

// Step 2: Create a smart account with that owner
let smart = try await cdp.evm.createSmartAccount(options: .init(owner: owner.address))
print("Created smart account: \(smart.address)")
print("Owners: \(smart.owners)")
