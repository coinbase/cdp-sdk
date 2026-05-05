// Usage: swift run EVMSignTransaction
// Requires: CDP_API_KEY_ID, CDP_API_KEY_SECRET, CDP_WALLET_SECRET env vars

import CDPSDK

let cdp = try CdpClient()

let account = try await cdp.evm.createAccount()
print("Created account: \(account.address)")

// Sign a properly RLP-encoded unsigned EIP-1559 transaction on base-sepolia.
// Format: 0x02 || RLP([chainId, nonce, maxPriorityFeePerGas, maxFeePerGas, gasLimit, to, value, data, accessList])
// This encodes: chainId=84532, nonce=0, maxPriorityFeePerGas=1.5gwei, maxFeePerGas=100gwei,
//               gasLimit=21000, to=0x4252...Fe8, value=0.000001ETH, data=empty, accessList=empty
let unsignedTx =
    "0x02f083014a34808459682f0085174876e800825208944252e0c9a3da5a2700e7d91cb50aef522d0c6fe885e8d4a5100080c0"

let result = try await cdp.evm.signTransaction(options: .init(
    address: account.address,
    transaction: unsignedTx
))

print("Signed transaction: \(result.signature)")
