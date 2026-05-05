// Usage: swift run SolanaSendTransaction
// Requires: CDP_API_KEY_ID, CDP_API_KEY_SECRET, CDP_WALLET_SECRET env vars

import CDPSDK
import Foundation

let cdp = try CdpClient()

// Step 1: Get or create an account
let account = try await cdp.solana.getOrCreateAccount(name: "test-sol-account")
print("Successfully created Solana account: \(account.address)")

// Step 2: Request SOL from faucet
let faucet = try await cdp.solana.requestFaucet(options: .init(
    address: account.address,
    network: "solana-devnet",
    token: "sol"
))
print("Successfully requested SOL from faucet: \(faucet.transactionSignature)")

// Step 3: Build a SOL transfer transaction.
// In production, use a Solana SDK (e.g. Solana.Swift) for transaction construction.
let destinationAddress = "3KzDtddx4i53FBkvCzuDmRbaMozTZoJBb1TToWhz3JfE"
let lamportsToSend: UInt64 = 1000

let serializedTransaction = buildTransferTransaction(
    from: account.address,
    to: destinationAddress,
    lamports: lamportsToSend
)

// Step 4: Send via CDP (handles signing + real blockhash)
let result = try await cdp.solana.sendTransaction(options: .init(
    network: "solana-devnet",
    transaction: serializedTransaction
))

print("Transaction signature: \(result.signature)")
print("Explorer: https://explorer.solana.com/tx/\(result.signature)?cluster=devnet")

// MARK: - Transaction Builder Helper

/// Builds a minimal Solana SystemProgram.Transfer transaction serialized as base64.
/// Uses a placeholder blockhash — CDP's backend will set a real one.
func buildTransferTransaction(from: String, to: String, lamports: UInt64) -> String {
    let fromKey = base58Decode(from)
    let toKey = base58Decode(to)
    // SystemProgram ID: 11111111111111111111111111111111
    let systemProgram = Data(repeating: 0, count: 32)
    // Placeholder blockhash (32 zero bytes — CDP replaces this)
    let blockhash = Data(repeating: 0, count: 32)

    var message = Data()

    // Header: [numRequiredSignatures, numReadonlySignedAccounts, numReadonlyUnsignedAccounts]
    message.append(contentsOf: [1, 0, 1])

    // Account keys (3 accounts): from, to, systemProgram
    message.append(contentsOf: compactU16(3))
    message.append(fromKey)
    message.append(toKey)
    message.append(systemProgram)

    // Recent blockhash
    message.append(blockhash)

    // Instructions (1 instruction)
    message.append(contentsOf: compactU16(1))

    // SystemProgram.Transfer instruction
    message.append(2) // programIdIndex = 2 (systemProgram)
    message.append(contentsOf: compactU16(2)) // 2 account indices
    message.append(0) // from account index
    message.append(1) // to account index

    // Instruction data: transfer instruction (index 2) + lamports (u64 LE)
    var instructionData = Data()
    var transferIndex: UInt32 = 2
    instructionData.append(Data(bytes: &transferIndex, count: 4))
    var amount = lamports
    instructionData.append(Data(bytes: &amount, count: 8))

    message.append(contentsOf: compactU16(instructionData.count))
    message.append(instructionData)

    // Full transaction: signatures array + message
    var transaction = Data()
    transaction.append(contentsOf: compactU16(1)) // 1 signature slot
    transaction.append(Data(repeating: 0, count: 64)) // empty signature placeholder
    transaction.append(message)

    return transaction.base64EncodedString()
}

func compactU16(_ value: Int) -> [UInt8] {
    if value < 128 {
        return [UInt8(value)]
    } else if value < 16384 {
        return [UInt8((value & 0x7F) | 0x80), UInt8(value >> 7)]
    } else {
        return [UInt8((value & 0x7F) | 0x80), UInt8(((value >> 7) & 0x7F) | 0x80), UInt8(value >> 14)]
    }
}

// Minimal Base58 decoder for Solana addresses
func base58Decode(_ string: String) -> Data {
    let alphabet = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"
    let base = 58

    var result = [UInt8]()
    for char in string {
        guard let index = alphabet.firstIndex(of: char) else { continue }
        let digit = alphabet.distance(from: alphabet.startIndex, to: index)
        var carry = digit
        for i in 0..<result.count {
            carry += Int(result[i]) * base
            result[i] = UInt8(carry & 0xFF)
            carry >>= 8
        }
        while carry > 0 {
            result.append(UInt8(carry & 0xFF))
            carry >>= 8
        }
    }

    // Add leading zeros
    for char in string {
        if char == "1" {
            result.append(0)
        } else {
            break
        }
    }

    return Data(result.reversed())
}
