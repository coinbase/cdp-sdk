// Usage: swift run EVMSignMessage
// Requires: CDP_API_KEY_ID, CDP_API_KEY_SECRET, CDP_WALLET_SECRET env vars

import CDPSDK

let cdp = try CdpClient()

let account = try await cdp.evm.createAccount()
print("Created account: \(account.address)")

let result = try await cdp.evm.signMessage(options: .init(
    address: account.address,
    message: "Hello, world!"
))

print("Signature: \(result.signature)")
