// Usage: swift run SolanaRequestFaucet
// Requires: CDP_API_KEY_ID, CDP_API_KEY_SECRET env vars

import CDPSDK

let cdp = try CdpClient()

let account = try await cdp.solana.createAccount()

let result = try await cdp.solana.requestFaucet(options: .init(
    address: account.address,
    network: "solana-devnet",
    token: "sol"
))

print("Successfully requested Solana faucet: \(result.transactionSignature)")
