# CDP SDK Swift Examples

Runnable examples demonstrating the CDP Swift SDK for EVM and Solana operations.

## Prerequisites

- Swift 5.9+
- macOS 13+
- CDP API credentials (set as environment variables)

## Environment Variables

```bash
export CDP_API_KEY_ID="your-api-key-id"
export CDP_API_KEY_SECRET="your-api-key-secret"
export CDP_WALLET_SECRET="your-wallet-secret"  # Required for signing/sending operations
```

## Running Examples

From the `examples/swift/` directory:

```bash
swift run <ExampleName>
```

For example:

```bash
cd examples/swift
swift run EVMCreateAccount
swift run SolanaSendTransaction
```

## Project Structure

This directory is an SPM package with multiple executable targets. The `cdp-sdk` symlink
points to `../../swift` (the SDK source), allowing local development without publishing.

## Available Examples

### EVM Accounts

| Example | Description |
|---------|-------------|
| `EVMCreateAccount` | Create a new server-managed EVM account |
| `EVMGetOrCreateAccount` | Idempotently get or create a named EVM account |
| `EVMListAccounts` | List all EVM accounts with pagination |

### EVM Signing

| Example | Description |
|---------|-------------|
| `EVMSignMessage` | Sign a plaintext message (EIP-191) |
| `EVMSignHash` | Sign a 32-byte hash |
| `EVMSignTransaction` | Sign an RLP-encoded transaction |

### EVM Transactions

| Example | Description |
|---------|-------------|
| `EVMSendTransaction` | Fund an account and send a transaction on Base Sepolia |
| `EVMRequestFaucet` | Request testnet ETH from the faucet |

### EVM Smart Accounts

| Example | Description |
|---------|-------------|
| `EVMCreateSmartAccount` | Create a smart account (Account Abstraction) |

### Solana Accounts

| Example | Description |
|---------|-------------|
| `SolanaCreateAccount` | Create a new server-managed Solana account |
| `SolanaGetOrCreateAccount` | Idempotently get or create a named Solana account |
| `SolanaListAccounts` | List all Solana accounts with pagination |

### Solana Signing

| Example | Description |
|---------|-------------|
| `SolanaSignMessage` | Sign a message with a Solana account |
| `SolanaSignTransaction` | Build and sign a SOL transfer transaction |

### Solana Transactions

| Example | Description |
|---------|-------------|
| `SolanaSendTransaction` | Fund, build, and send a SOL transfer on devnet |
| `SolanaRequestFaucet` | Request testnet SOL from the faucet |
