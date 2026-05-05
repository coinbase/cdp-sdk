// Usage: swift run SolanaSignMessage
// Requires: CDP_API_KEY_ID, CDP_API_KEY_SECRET, CDP_WALLET_SECRET env vars

import CDPSDK

let cdp = try CdpClient()

let account = try await cdp.solana.createAccount()
print("Successfully created Solana account: \(account.address)")

let result = try await cdp.solana.signMessage(options: .init(
    address: account.address,
    message: "Hello, world!"
))

print("Successfully signed message: \(result.signature)")
