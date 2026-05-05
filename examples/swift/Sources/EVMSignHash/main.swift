// Usage: swift run EVMSignHash
// Requires: CDP_API_KEY_ID, CDP_API_KEY_SECRET, CDP_WALLET_SECRET env vars

import CDPSDK
import Foundation

let cdp = try CdpClient()

let account = try await cdp.evm.createAccount()
print("Created account: \(account.address)")

// Sign a 32-byte keccak256 hash (hex-encoded)
let result = try await cdp.evm.signHash(options: .init(
    address: account.address,
    hash: "0x1c8aff950685c2ed4bc3174f3472287b56d9517b9c948127319a09a7a36deac8"
))

print("Signature: \(result.signature)")
