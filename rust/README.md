# CDP Rust SDK

A Rust client library for the Coinbase Developer Platform (CDP) APIs.

## Features

- 🔐 **Automatic Authentication**: Built-in JWT-based authentication with support for both API keys and wallet secrets
- 🔧 **Request Middleware**: Uses `reqwest-middleware` for request/response interception and authentication
- 🚀 **Async/Await Support**: Fully async API with Tokio runtime
- 📦 **Type-Safe**: Generated OpenAPI client with full type safety
- 🌐 **Multi-Chain Support**: EVM and Solana blockchain support
- 🎯 **Modular Design**: Clean separation between authentication, client configuration, and API calls

## Quick Start

### Installation

Add this to your `Cargo.toml`:

```toml
[dependencies]
cdp-sdk = { path = "./path/to/cdp-sdk/rust" }
tokio = { version = "1.0", features = ["full"] }
```

### Basic Usage (Recommended - Wrapped API)

```rust
use cdp_sdk::{CdpClient, CdpClientOptions};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Create client with environment variables or explicit credentials
    let client = CdpClient::new(CdpClientOptions::default())?;

    // Use high-level APIs - no need to import openapi_client!
    let accounts = client.evm().list_accounts().await?;
    println!("Found {} EVM accounts", accounts.accounts.len());

    // Create a new account
    let new_account = client.evm().create_account_simple("My Account").await?;
    println!("Created account: {}", new_account.address);

    // Sign a transaction
    let signed = client.evm().sign_transaction(
        &new_account.address,
        "0x02f86e0182012c..." // RLP-encoded transaction
    ).await?;
    println!("Signed transaction: {}", signed.signed_transaction);

    Ok(())
}
```

### Advanced Usage (Direct OpenAPI Client)

For advanced users who need full control:

```rust
use cdp_sdk::{CdpClient, CdpClientOptions};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let client = CdpClient::new(CdpClientOptions::default())?;
    let config = client.openapi_config();

    // Direct API access for advanced usage
    let accounts = openapi_client::apis::evm_accounts_api::list_evm_accounts(
        &config,
        openapi_client::apis::evm_accounts_api::ListEvmAccountsParams {
            page_size: Some(10),
            page_token: None,
        }
    ).await?;

    Ok(())
}
```

## Configuration

### Environment Variables

You can configure the client using environment variables:

```bash
export CDP_API_KEY_ID="your-api-key-id"
export CDP_API_KEY_SECRET="your-api-key-secret"  
export CDP_WALLET_SECRET="your-wallet-secret"
```

### Options

When creating a client, you can pass the following options:

- `api_key_id`: Your CDP API key ID (required)
- `api_key_secret`: Your CDP API key secret (required) 
- `wallet_secret`: Your wallet secret (required for write operations)
- `debugging`: Enable debug logging (optional)
- `base_path`: Custom API base URL (optional)
- `source`: Source identifier for requests (optional)
- `source_version`: Source version for requests (optional) 
- `expires_in`: JWT expiration time in seconds (optional, default: 120)

## Authentication

The SDK automatically handles authentication for all API requests:

1. **JWT Generation**: Creates signed JWTs using your API key secret
2. **Wallet Authentication**: Adds wallet JWT for operations requiring wallet access
3. **Request Signing**: Signs requests with appropriate headers
4. **Automatic Retry**: Built-in support for authentication token refresh

### Authentication Headers

The middleware automatically adds:

- `Authorization: Bearer <jwt>` - Main API authentication
- `X-Wallet-Auth: <wallet-jwt>` - Wallet-specific authentication (when needed)
- `Correlation-Context` - SDK version and language information
- `Content-Type: application/json` - Request content type

## API Usage

The SDK provides two levels of API access:

### 1. High-Level Wrapped APIs (Recommended)

Easy-to-use wrapper methods that handle common operations:

```rust
let client = CdpClient::new(CdpClientOptions::default())?;

// EVM Operations
let accounts = client.evm().list_accounts().await?;
let new_account = client.evm().create_account_simple("My Account").await?;
let account = client.evm().get_account("0x...").await?;
let signed_tx = client.evm().sign_transaction("0x...", "0x...").await?;

// Solana Operations  
let sol_accounts = client.solana().list_accounts().await?;
let new_sol_account = client.solana().create_account_simple("My Sol Account").await?;
let sol_account = client.solana().get_account("address").await?;
let signed_sol_tx = client.solana().sign_transaction("address", "transaction").await?;

// Policy Management
let policies = client.policies().list_policies().await?;
client.policies().delete_policy("policy_id").await?;
```

### 2. Direct OpenAPI Client (Advanced)

For full control and access to all API parameters:

```rust
let config = client.openapi_config();

// Direct API access with full parameter control
let accounts = openapi_client::apis::evm_accounts_api::list_evm_accounts(&config, params).await?;
let smart_accounts = openapi_client::apis::evm_smart_accounts_api::list_evm_smart_accounts(&config, params).await?;
```

## Examples

Run the included examples:

```bash
# Basic usage example
cargo run --example basic_usage

# Transaction signing example
export CDP_ACCOUNT_ADDRESS="your-account-address"
cargo run --example sign_transaction

# Wrapped API usage example (recommended)
cargo run --example wrapped_api_usage
```

## Error Handling

The SDK provides comprehensive error handling:

```rust
use cdp_sdk::CdpError;

match client_result {
    Ok(client) => { /* use client */ },
    Err(CdpError::Config(msg)) => eprintln!("Configuration error: {}", msg),
    Err(CdpError::Auth(msg)) => eprintln!("Authentication error: {}", msg),
    Err(CdpError::Http(err)) => eprintln!("HTTP error: {}", err),
    Err(err) => eprintln!("Other error: {}", err),
}
```

## Architecture

The SDK is organized into several modules:

- **`client`**: Main `CdpClient` implementation and configuration
- **`auth`**: Authentication middleware and JWT generation
- **`error`**: Error types and handling
- **`openapi_client`**: Generated OpenAPI client (re-exported)

### Key Design Decisions

1. **Middleware-based Authentication**: Uses `reqwest-middleware` for automatic request signing
2. **Configuration over Convention**: Explicit configuration with environment variable fallbacks
3. **Type Safety**: Leverages Rust's type system for compile-time API correctness
4. **Async First**: Built for async/await from the ground up

## Development

### Building

```bash
cargo build
```

### Testing

```bash
cargo test
```

### Linting

```bash
cargo clippy
```

## License

This project is licensed under the MIT License.