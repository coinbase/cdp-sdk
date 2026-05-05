# Coinbase Developer Platform (CDP) Swift SDK

[![Swift 5.9+](https://img.shields.io/badge/Swift-5.9+-orange.svg)](https://swift.org)
[![Platforms](https://img.shields.io/badge/Platforms-iOS%2016+%20|%20macOS%2013+-blue.svg)](https://developer.apple.com/swift/)
[![License](https://img.shields.io/badge/License-Apache%202.0-green.svg)](https://github.com/coinbase/cdp-sdk/blob/main/LICENSE.md)

## Table of Contents

- [CDP SDK](#cdp-sdk)
- [Documentation](#documentation)
- [Installation](#installation)
- [Requirements](#requirements)
- [API Keys](#api-keys)
- [Usage](#usage)
  - [Initialization](#initialization)
  - [Creating EVM Accounts](#creating-evm-accounts)
  - [Getting EVM Accounts](#getting-evm-accounts)
  - [Listing EVM Accounts](#listing-evm-accounts)
  - [Signing with EVM Accounts](#signing-with-evm-accounts)
  - [Sending EVM Transactions](#sending-evm-transactions)
  - [EVM Smart Accounts](#evm-smart-accounts)
  - [EVM Testnet Faucet](#evm-testnet-faucet)
  - [Creating Solana Accounts](#creating-solana-accounts)
  - [Getting Solana Accounts](#getting-solana-accounts)
  - [Listing Solana Accounts](#listing-solana-accounts)
  - [Signing with Solana Accounts](#signing-with-solana-accounts)
  - [Sending Solana Transactions](#sending-solana-transactions)
  - [Solana Testnet Faucet](#solana-testnet-faucet)
- [Authentication Tools](#authentication-tools)
  - [Generate API JWT](#generate-api-jwt)
  - [Generate Wallet JWT](#generate-wallet-jwt)
  - [Key Type Auto-Detection](#key-type-auto-detection)
- [Error Handling](#error-handling)
- [Development](#development)
- [License](#license)
- [Support](#support)
- [Security](#security)

## CDP SDK

This module contains the Swift CDP SDK, which provides a client for interacting with the [Coinbase Developer Platform (CDP)](https://docs.cdp.coinbase.com/). It includes a CDP Client for interacting with EVM and Solana APIs to create accounts and send transactions, as well as authentication tools for interacting directly with the CDP APIs.

The SDK is composed of two targets:

- **CDPSDK** — Full SDK client for account management, signing, and transactions
- **CDPAuth** — Standalone authentication module (JWT generation, key parsing) with no OpenAPI dependencies

> [!TIP]
>
> If you're looking to contribute to the SDK, please see the [Contributing Guide](https://github.com/coinbase/cdp-sdk/blob/main/swift/CONTRIBUTING.md).

## Documentation

Further documentation is available on the CDP docs website:

- [Wallet API v2](https://docs.cdp.coinbase.com/wallet-api-v2/docs/welcome)
- [API Reference](https://docs.cdp.coinbase.com/api-v2/docs/welcome)

## Installation

Add the CDP SDK to your Swift package dependencies:

```swift
// Package.swift
dependencies: [
    .package(url: "https://github.com/coinbase/cdp-sdk", from: "0.1.0"),
]
```

Then add the product to your target:

```swift
.target(
    name: "YourApp",
    dependencies: [
        .product(name: "CDPSDK", package: "cdp-sdk"),
    ]
)
```

If you only need authentication (JWT generation) without the full SDK:

```swift
.target(
    name: "YourApp",
    dependencies: [
        .product(name: "CDPAuth", package: "cdp-sdk"),
    ]
)
```

## Requirements

- Swift 5.9+
- iOS 16+ / macOS 13+
- A [CDP API Key](https://portal.cdp.coinbase.com/access/api)

## API Keys

To start, [create a CDP API Key](https://portal.cdp.coinbase.com/access/api). Save the `API Key ID` and `API Key Secret` for use in the SDK. You will also need to create a wallet secret in the Portal to sign transactions.

## Usage

### Initialization

#### Load from environment variables

Export your CDP credentials as environment variables:

```bash
export CDP_API_KEY_ID="YOUR_API_KEY_ID"
export CDP_API_KEY_SECRET="YOUR_API_KEY_SECRET"
export CDP_WALLET_SECRET="YOUR_WALLET_SECRET"
```

Then initialize the client:

```swift
import CDPSDK

let cdp = try CdpClient()
```

#### Pass credentials directly

```swift
import CDPSDK

let cdp = try CdpClient(options: .init(
    apiKeyId: "your-api-key-id",
    apiKeySecret: "your-api-key-secret",
    walletSecret: "your-wallet-secret"
))
```

#### Configuration options

```swift
let cdp = try CdpClient(options: .init(
    apiKeyId: "your-api-key-id",
    apiKeySecret: "your-api-key-secret",
    walletSecret: "your-wallet-secret",
    basePath: "https://api.cdp.coinbase.com/platform", // Custom base URL
    debugging: true // Enable HTTP request/response logging
))
```

### Creating EVM Accounts

Create a new server-managed EVM account:

```swift
// Create with auto-generated name
let account = try await cdp.evm.createAccount()
print("Address: \(account.address)")

// Create with a specific name
let named = try await cdp.evm.createAccount(options: .init(name: "treasury"))
print("Address: \(named.address), Name: \(named.name ?? "")")

// Create with idempotency key (safe for retries)
let account = try await cdp.evm.createAccount(options: .init(
    name: "payments",
    idempotencyKey: "unique-request-id"
))
```

### Getting EVM Accounts

Retrieve an existing account by address or name:

```swift
// By address
let account = try await cdp.evm.getAccount(address: "0x1234...")
print("Name: \(account.name ?? "unnamed")")

// By name
let account = try await cdp.evm.getAccount(name: "treasury")
print("Address: \(account.address)")

// Get or create (idempotent — returns existing or creates new)
let account = try await cdp.evm.getOrCreateAccount(name: "my-account")
print("Address: \(account.address)")
```

`getOrCreateAccount` handles the full flow: attempts to get the account by name, creates it if not found (404), and retries the get if a conflict (409) occurs.

### Listing EVM Accounts

List accounts with pagination:

```swift
// First page
var page = try await cdp.evm.listAccounts(options: .init(pageSize: 10))
for account in page.accounts {
    print("\(account.address) — \(account.name ?? "unnamed")")
}

// Subsequent pages
while let token = page.nextPageToken {
    page = try await cdp.evm.listAccounts(options: .init(pageToken: token))
    for account in page.accounts {
        print("\(account.address)")
    }
}
```

### Signing with EVM Accounts

#### Sign a hash

Sign an arbitrary 32-byte hash (useful for EIP-712 typed data):

```swift
let result = try await cdp.evm.signHash(options: .init(
    address: account.address,
    hash: "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890"
))
print("Signature: \(result.signature)")
```

#### Sign a message (EIP-191)

Sign a human-readable message using the [EIP-191](https://eips.ethereum.org/EIPS/eip-191) standard:

```swift
let result = try await cdp.evm.signMessage(options: .init(
    address: account.address,
    message: "Hello from CDP!"
))
print("Signature: \(result.signature)")
```

#### Sign a transaction

Sign an RLP-encoded unsigned EIP-1559 transaction:

```swift
let result = try await cdp.evm.signTransaction(options: .init(
    address: account.address,
    transaction: "0x02f083014a34..." // RLP-encoded unsigned EIP-1559 tx
))
print("Signed transaction: \(result.signature)")
```

The `transaction` field must be an RLP-encoded unsigned EIP-1559 transaction as a `0x`-prefixed hex string.

### Sending EVM Transactions

Sign and send a transaction in one call:

```swift
let result = try await cdp.evm.sendTransaction(options: .init(
    address: account.address,
    transaction: .raw("0x02f083014a34..."), // RLP-encoded unsigned EIP-1559 tx
    network: "base-sepolia"
))
print("Transaction hash: \(result.transactionHash)")
print("Explorer: https://sepolia.basescan.org/tx/\(result.transactionHash)")
```

Supported networks include: `base`, `base-sepolia`, `ethereum`, `ethereum-sepolia`, `arbitrum`, `arbitrum-sepolia`, `optimism`, `polygon`, `avalanche`.

### EVM Smart Accounts

Create and manage smart contract accounts (Account Abstraction):

```swift
// Create a smart account owned by a server account
let owner = try await cdp.evm.createAccount()
let smart = try await cdp.evm.createSmartAccount(options: .init(
    owner: owner.address
))
print("Smart account: \(smart.address)")
print("Owners: \(smart.owners)")

// Get an existing smart account
let fetched = try await cdp.evm.getSmartAccount(address: smart.address)

// List all smart accounts
let page = try await cdp.evm.listSmartAccounts()
for account in page.accounts {
    print("\(account.address) — owners: \(account.owners)")
}
```

### EVM Testnet Faucet

Request testnet funds for development:

```swift
let result = try await cdp.evm.requestFaucet(options: .init(
    address: account.address,
    network: "base-sepolia",
    token: "eth"
))
print("Faucet tx: https://sepolia.basescan.org/tx/\(result.transactionHash)")
```

Supported faucet tokens include `eth`, `usdc`, and others depending on the network.

### Creating Solana Accounts

Create a new server-managed Solana account:

```swift
// Create with auto-generated name
let account = try await cdp.solana.createAccount()
print("Address: \(account.address)")

// Create with a specific name
let named = try await cdp.solana.createAccount(options: .init(name: "sol-treasury"))
print("Address: \(named.address)")
```

### Getting Solana Accounts

```swift
// By address (base58)
let account = try await cdp.solana.getAccount(address: "8aVtJE...")
print("Name: \(account.name ?? "unnamed")")

// By name
let account = try await cdp.solana.getAccount(name: "sol-treasury")
print("Address: \(account.address)")

// Get or create (idempotent)
let account = try await cdp.solana.getOrCreateAccount(name: "my-sol-account")
```

### Listing Solana Accounts

```swift
var page = try await cdp.solana.listAccounts(options: .init(pageSize: 10))
for account in page.accounts {
    print("\(account.address) — \(account.name ?? "unnamed")")
}

while let token = page.nextPageToken {
    page = try await cdp.solana.listAccounts(options: .init(pageToken: token))
    for account in page.accounts {
        print("\(account.address)")
    }
}
```

### Signing with Solana Accounts

#### Sign a message

```swift
let result = try await cdp.solana.signMessage(options: .init(
    address: account.address,
    message: "Hello from Solana!"
))
print("Signature: \(result.signature)")
```

#### Sign a transaction

Sign a base64-encoded Solana transaction:

```swift
let result = try await cdp.solana.signTransaction(options: .init(
    address: account.address,
    transaction: "base64-encoded-transaction..."
))
print("Signed transaction: \(result.signedTransaction)")
```

### Sending Solana Transactions

```swift
let result = try await cdp.solana.sendTransaction(options: .init(
    network: "solana-devnet",
    transaction: "base64-encoded-transaction..."
))
print("Signature: \(result.signature)")
print("Explorer: https://explorer.solana.com/tx/\(result.signature)?cluster=devnet")
```

### Solana Testnet Faucet

```swift
let result = try await cdp.solana.requestFaucet(options: .init(
    address: account.address,
    network: "solana-devnet",
    token: "sol"
))
print("Faucet signature: \(result.transactionSignature)")
```

## Authentication Tools

The `CDPAuth` module provides standalone JWT generation for authenticating with CDP APIs. Use this if you're building custom integrations or need to authenticate requests outside the SDK client.

```swift
import CDPAuth
```

### Generate API JWT

Generate a JWT for API authentication:

```swift
let jwt = try generateJwt(options: JwtOptions(
    apiKeyId: "your-key-id",
    apiKeySecret: "-----BEGIN EC PRIVATE KEY-----\n...\n-----END EC PRIVATE KEY-----",
    requestMethod: "GET",
    requestHost: "api.cdp.coinbase.com",
    requestPath: "/platform/v2/evm/accounts"
))
// Use as: Authorization: Bearer <jwt>
```

The function auto-detects the key type:
- **EC PEM keys** → ES256 (P-256) algorithm
- **Base64 64-byte keys** → EdDSA (Ed25519) algorithm

### Generate Wallet JWT

Generate a JWT for wallet operations (account creation, signing):

```swift
let walletJwt = try generateWalletJwt(options: WalletJwtOptions(
    walletSecret: "base64-encoded-der-key",
    requestMethod: "POST",
    requestHost: "api.cdp.coinbase.com",
    requestPath: "/platform/v2/evm/accounts/0x.../sign-hash",
    body: requestBodyData // Optional: used for request hash
))
// Use as: X-Wallet-Auth: <walletJwt>
```

Wallet JWTs always use ES256 (P-256) signing. The body is hashed (SHA-256) and included as the `reqHash` claim.

### Key Type Auto-Detection

The SDK automatically detects your API key type:

| Key Format | Algorithm | Detection |
|-----------|-----------|-----------|
| PEM-encoded EC key | ES256 (P-256) | Contains `BEGIN EC PRIVATE KEY` or `BEGIN PRIVATE KEY` |
| Base64 64-byte raw key | EdDSA (Ed25519) | Decodes to exactly 64 bytes |

Both key types are fully supported for API authentication. Wallet secrets always use P-256 (DER-encoded).

## Error Handling

All SDK operations throw `CdpError`, which provides structured error information:

```swift
do {
    let account = try await cdp.evm.getAccount(address: "0xNonExistent")
} catch let error as CdpError {
    switch error {
    case .configuration(let message):
        // Missing or invalid configuration (API keys, etc.)
        print("Config error: \(message)")

    case .authentication(let message):
        // JWT generation or key parsing failure
        print("Auth error: \(message)")

    case .api(let apiError):
        // HTTP error from the CDP API
        print("Status: \(apiError.statusCode)")       // e.g., 404
        print("Type: \(apiError.errorType)")           // e.g., "not_found"
        print("Message: \(apiError.message)")          // e.g., "Account not found"
        print("Correlation: \(apiError.correlationId ?? "none")")  // For CDP support

    case .network(let message, let retryable):
        // Network connectivity failure
        print("Network error: \(message), retryable: \(retryable)")

    case .validation(let message):
        // Client-side validation failure
        print("Validation error: \(message)")

    case .timeout(let message):
        // Request timeout
        print("Timeout: \(message)")
    }
}
```

### Common API Error Types

| Status | Error Type | Description |
|--------|-----------|-------------|
| 400 | `invalid_request` | Malformed request parameters |
| 400 | `malformed_transaction` | Invalid transaction encoding |
| 401 | `unauthorized` | Invalid or expired credentials |
| 403 | `policy_violation` | Request violates account policy |
| 404 | `not_found` | Resource does not exist |
| 409 | `already_exists` | Resource already exists (idempotency conflict) |
| 429 | `rate_limit_exceeded` | Too many requests |
| 500 | `internal_server_error` | Server error |

## Development

### Prerequisites

- Swift 5.9+ (Xcode 15+)
- `swift-format` for linting/formatting

### Build

```bash
cd swift/
make build
```

### Test

```bash
# Unit tests
make test

# E2E tests (requires CDP credentials)
export CDP_API_KEY_ID="..."
export CDP_API_KEY_SECRET="..."
export CDP_WALLET_SECRET="..."
make test-e2e
```

### Lint & Format

```bash
# Check for lint issues
make lint

# Check formatting (strict, for CI)
make format-check

# Auto-fix formatting
make format
```

### Generate OpenAPI Client

The SDK uses Apple's `swift-openapi-generator` build plugin. Types are generated at build time from `openapi.yaml`. To update after spec changes:

```bash
make generate
```

### Clean

```bash
make clean
```

### Running Examples

See [`examples/swift/`](../examples/swift/) for runnable examples:

```bash
cd examples/swift/
export CDP_API_KEY_ID="..."
export CDP_API_KEY_SECRET="..."
export CDP_WALLET_SECRET="..."

swift run EVMCreateAccount
swift run EVMSignMessage
swift run SolanaCreateAccount
swift run SolanaRequestFaucet
# ... and more
```

## License

This project is licensed under the Apache 2.0 License - see the [LICENSE](https://github.com/coinbase/cdp-sdk/blob/main/LICENSE.md) file for details.

## Support

For feature requests, feedback, or questions, please reach out to us in the **#cdp-sdk** channel of the [Coinbase Developer Platform Discord](https://discord.com/invite/cdp).

- [API Reference](https://docs.cdp.coinbase.com/api-v2/docs/welcome)
- [GitHub Issues](https://github.com/coinbase/cdp-sdk/issues)

## Security

If you discover a security vulnerability within this SDK, please see our [Security Policy](https://github.com/coinbase/cdp-sdk/blob/main/SECURITY.md) for disclosure information.
