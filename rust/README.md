# Coinbase Developer Platform (CDP) Rust SDK

[![Crates.io](https://img.shields.io/crates/v/cdp-sdk.svg)](https://crates.io/crates/cdp-sdk)
[![Documentation](https://docs.rs/cdp-sdk/badge.svg)](https://docs.rs/cdp-sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Table of Contents

- [CDP SDK](#cdp-sdk)
- [Documentation](#documentation)
- [Features](#features)
- [Installation](#installation)
- [API Keys](#api-keys)
- [Usage](#usage)
  - [Initialization](#initialization)
  - [Creating EVM Accounts](#creating-evm-accounts)
  - [Retrieving EVM Accounts](#retrieving-evm-accounts)
  - [Updating EVM Accounts](#updating-evm-accounts)
  - [Listing EVM Accounts](#listing-evm-accounts)
- [Authentication Tools](#authentication-tools)
- [Development](#development)
- [License](#license)
- [Support](#support)
- [Security](#security)

> [!TIP]
>
> If you're looking to contribute to the SDK, please see the [Contributing Guide](https://github.com/coinbase/cdp-sdk/blob/main/rust/CONTRIBUTING.md).

## CDP SDK

This module contains the Rust CDP SDK, which is a library that provides a client for interacting with the [Coinbase Developer Platform (CDP)](https://docs.cdp.coinbase.com/). It includes a CDP Client for interacting with EVM and Solana APIs to create accounts and send transactions, policy APIs to govern transaction permissions, as well as authentication tools for interacting directly with the CDP APIs.

## Documentation

CDP SDK has [auto-generated docs for the Rust SDK](https://docs.rs/cdp-sdk).

Further documentation is also available on the CDP docs website:

- [Wallet API v2](https://docs.cdp.coinbase.com/wallet-api-v2/docs/welcome)
- [API Reference](https://docs.cdp.coinbase.com/api-v2/docs/welcome)

## Features

- 🔐 **Automatic Authentication**: Built-in JWT-based authentication with support for both API keys and wallet secrets
- 🚀 **Async/Await Support**: Fully async API with Tokio runtime
- 📦 **Type-Safe**: Generated OpenAPI client with full type safety
- 🌐 **Multi-Chain Support**: EVM and Solana blockchain support
- 🧪 **Trait-Based Architecture**: Easy testing and mocking with comprehensive trait interfaces

## Installation

Add this to your `Cargo.toml`:

```toml
[dependencies]
cdp-sdk = "0.1"
tokio = { version = "1.0", features = ["full"] }
```

## API Keys

To start, [create a CDP API Key](https://portal.cdp.coinbase.com/access/api). Save the `API Key ID` and `API Key Secret` for use in the SDK. You will also need to create a wallet secret in the Portal to sign transactions.

## Usage

### Initialization

#### Load client config from shell

One option is to export your CDP API Key and Wallet Secret as environment variables:

```bash
export CDP_API_KEY_ID="YOUR_API_KEY_ID"
export CDP_API_KEY_SECRET="YOUR_API_KEY_SECRET"
export CDP_WALLET_SECRET="YOUR_WALLET_SECRET"
```

Then, initialize the client:

```rust
use cdp_sdk::{auth::WalletAuth, Client, CDP_BASE_URL};
use reqwest_middleware::ClientBuilder;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Initialize the CDP client using environment variables
    let wallet_auth = WalletAuth::builder().build()?;
    let http_client = ClientBuilder::new(reqwest::Client::new())
        .with(wallet_auth)
        .build();
    
    let client = Client::new_with_client(CDP_BASE_URL, http_client);
    
    Ok(())
}
```

#### Pass the API Key and Wallet Secret to the client

Another option is to directly pass the API Key and Wallet Secret to the client:

```rust
use cdp_sdk::{auth::WalletAuth, Client, CDP_BASE_URL};
use reqwest_middleware::ClientBuilder;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Initialize with explicit credentials
    let wallet_auth = WalletAuth::builder()
        .api_key_id("your-api-key-id".to_string())
        .api_key_secret("your-api-key-secret".to_string())
        .wallet_secret("your-wallet-secret".to_string())
        .build()?;
    
    let http_client = ClientBuilder::new(reqwest::Client::new())
        .with(wallet_auth)
        .build();
    
    let client = Client::new_with_client(CDP_BASE_URL, http_client);
    
    Ok(())
}
```

### Creating EVM Accounts

Create a new EVM account:

```rust
use cdp_sdk::types;

// Create a new EVM account with a name
let body = types::CreateEvmAccountBody::builder()
    .name(Some("my-evm-account".parse()?));

let response = client
    .create_evm_account()
    .x_wallet_auth("") // Added by WalletAuth middleware
    .x_idempotency_key("unique-request-id")
    .body(body)
    .send()
    .await?;

let account = response.into_inner();
println!("Created account: {:?}", account);
```

### Retrieving EVM Accounts

#### Get account by address:

```rust
// Get an account by its address
let response = client
    .get_evm_account()
    .address("0x1234567890123456789012345678901234567890")
    .send()
    .await?;

let account = response.into_inner();
println!("Account: {:?}", account);
```

#### Get account by name:

```rust
// Get an account by its name
let response = client
    .get_evm_account_by_name()
    .name("my-evm-account")
    .send()
    .await?;

let account = response.into_inner();
println!("Account: {:?}", account);
```

### Updating EVM Accounts

Update an existing EVM account:

```rust
use cdp_sdk::types;

// Update an account's name
let update_body = types::UpdateEvmAccountBody::builder()
    .name(Some("updated-account-name".parse()?));

let response = client
    .update_evm_account()
    .address("0x1234567890123456789012345678901234567890")
    .body(update_body)
    .send()
    .await?;

let updated_account = response.into_inner();
println!("Updated account: {:?}", updated_account);
```

### Listing EVM Accounts

List all EVM accounts:

```rust
// List all EVM accounts with pagination
let response = client
    .list_evm_accounts()
    .page_size(10)
    .send()
    .await?;

let accounts_list = response.into_inner();
println!("Found {} accounts", accounts_list.accounts.len());

for account in accounts_list.accounts {
    println!("Account: {} - {:?}", account.address, account.name);
}
```

## Authentication Tools

This SDK also contains simple tools for authenticating REST API requests to the [Coinbase Developer Platform (CDP)](https://docs.cdp.coinbase.com/). The authentication is handled automatically when using the high-level client, but you can access the underlying authentication mechanisms if needed.

## Development

### Building

```bash
make build
```

### Testing

Run all tests (unit + integration):
```bash
make test
```

Run unit tests only:
```bash
make test-unit
```

Run end-to-end tests:
```bash
make test-e2e
```

### Linting

```bash
make lint
```

Fix linting issues:
```bash
make lint-fix
```

### Code Formatting

```bash
make format
```

### Documentation

Generate documentation:
```bash
make docs
```

### Other Commands

Clean build artifacts:
```bash
make clean
```

Generate client from OpenAPI spec:
```bash
make client
```

For a full list of available commands:
```bash
make help
```

## License

This project is licensed under the MIT License - see the [LICENSE](https://github.com/coinbase/cdp-sdk/tree/main/LICENSE.md) file for details.

## Support

For feature requests, feedback, or questions, please reach out to us in the **#cdp-sdk** channel of the [Coinbase Developer Platform Discord](https://discord.com/invite/cdp).

- [API Reference](https://docs.cdp.coinbase.com/api-v2/docs/welcome)
- [SDK Docs](https://docs.rs/cdp-sdk)
- [GitHub Issues](https://github.com/coinbase/cdp-sdk/issues)

## Security

If you discover a security vulnerability within this SDK, please see our [Security Policy](https://github.com/coinbase/cdp-sdk/tree/main/SECURITY.md) for disclosure information.
