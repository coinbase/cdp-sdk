// Usage: swift run EVMRequestFaucet
// Requires: CDP_API_KEY_ID, CDP_API_KEY_SECRET env vars

import CDPSDK

let cdp = try CdpClient()

let account = try await cdp.evm.createAccount()

let result = try await cdp.evm.requestFaucet(options: .init(
    address: account.address,
    network: "base-sepolia",
    token: "eth"
))

print("Faucet transaction: https://sepolia.basescan.org/tx/\(result.transactionHash)")
