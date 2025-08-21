# CDP SDK Examples

## Setup

Follow these steps to get started:

1. Get a CDP API key and wallet secret from the [CDP Portal](https://portal.cdp.coinbase.com/access/api)
1. Fill in your API key and wallet secret in `.env.example`, then run `mv .env.example .env`
1. In the `examples/rust` folder, run `cargo check` to verify dependencies are installed

## Usage

To run an example, use `cargo run --example` followed by the example name, for example:

```bash
cargo run --example wallet_client
```

## Available Examples

- `wallet_client` - Basic wallet client initialization and usage
- `evm_account_management` - EVM account creation and management
- `evm_signing` - EVM transaction signing examples
- `smart_account_management` - Smart account operations and management
- `solana_account_management` - Solana account creation and management
- `solana_signing` - Solana transaction signing examples
- `token_balances` - Retrieving and displaying token balances