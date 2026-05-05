// Usage: swift run EVMSendTransaction
// Requires: CDP_API_KEY_ID, CDP_API_KEY_SECRET, CDP_WALLET_SECRET env vars

import CDPSDK

let cdp = try CdpClient()

// Step 1: Create a new EVM account
let account = try await cdp.evm.createAccount()
print("Successfully created EVM account: \(account.address)")

// Step 2: Request ETH from the faucet
let faucet = try await cdp.evm.requestFaucet(options: .init(
    address: account.address,
    network: "base-sepolia",
    token: "eth"
))
print("Faucet transaction: https://sepolia.basescan.org/tx/\(faucet.transactionHash)")

// Wait for faucet transaction to confirm
print("Waiting for faucet to confirm...")
try await Task.sleep(nanoseconds: 5_000_000_000)  // 5 seconds

// Step 3: Send a transaction
// The transaction must be an RLP-encoded unsigned EIP-1559 transaction (0x-prefixed hex).
// Format: 0x02 || RLP([chainId, nonce, maxPriorityFeePerGas, maxFeePerGas, gasLimit, to, value, data, accessList])
// The API handles nonce management and gas estimation when zeroed.
// This sends 0.000001 ETH to a destination address on base-sepolia.
let unsignedTx =
    "0x02e583014a3480808080944252e0c9a3da5a2700e7d91cb50aef522d0c6fe885e8d4a5100080c0"

let result = try await cdp.evm.sendTransaction(options: .init(
    address: account.address,
    transaction: .raw(unsignedTx),
    network: "base-sepolia"
))

print("Transaction hash: \(result.transactionHash)")
print("Explorer: https://sepolia.basescan.org/tx/\(result.transactionHash)")
