# CDP Java SDK Examples

This directory contains examples demonstrating how to use the CDP Java SDK.

## Prerequisites

- Java 17 or higher
- Gradle (wrapper included)
- CDP API credentials from [CDP Portal](https://portal.cdp.coinbase.com/projects/api-keys)

## Setup

1. Copy the environment template and configure your credentials:

```bash
cp .env.example .env
```

2. Edit `.env` with your CDP credentials:

```
CDP_API_KEY_ID=your-api-key-id
CDP_API_KEY_SECRET=your-api-key-secret
CDP_WALLET_SECRET=your-wallet-secret
```

## Running Examples

### Quickstart

The quickstart example demonstrates the basic SDK workflow:

```bash
./gradlew runQuickstart
```

### Running Specific Examples

Use the convenience tasks to run specific examples:

```bash
# EVM Examples
./gradlew runCreateEvmAccount    # Create an EVM account
./gradlew runListEvmAccounts     # List all EVM accounts
./gradlew runGetEvmAccount       # Get an account by address
./gradlew runSignMessage         # Sign a message
./gradlew runRequestFaucet       # Request testnet ETH

# Solana Examples
./gradlew runCreateSolanaAccount # Create a Solana account
./gradlew runListSolanaAccounts  # List all Solana accounts
```

### Running Any Example Class

You can also run any example by specifying the main class:

```bash
./gradlew run -PmainClass=com.coinbase.cdp.examples.evm.CreateAccount
```

### List Available Examples

To see all available example tasks:

```bash
./gradlew listExamples
```

## Examples Overview

### Quickstart

| Example | Description |
|---------|-------------|
| `Quickstart.java` | Complete workflow: create account, request faucet funds |

### EVM Examples

| Example | Description |
|---------|-------------|
| `CreateAccount.java` | Create a new EVM account |
| `ListAccounts.java` | List all EVM accounts in your project |
| `GetAccount.java` | Retrieve an account by its address |
| `SignMessage.java` | Sign an arbitrary message |
| `RequestFaucet.java` | Request testnet ETH from the faucet |

### Solana Examples

| Example | Description |
|---------|-------------|
| `CreateAccount.java` | Create a new Solana account |
| `ListAccounts.java` | List all Solana accounts in your project |

## Code Pattern

Each example follows a consistent pattern:

```java
import com.coinbase.cdp.CdpClient;
import com.coinbase.cdp.examples.utils.EnvLoader;
import com.coinbase.cdp.openapi.api.EvmAccountsApi;

public class Example {
    public static void main(String[] args) throws Exception {
        // Load .env file
        EnvLoader.load();

        try (CdpClient cdp = CdpClient.create()) {
            // Get configured API client
            EvmAccountsApi evmApi = new EvmAccountsApi(cdp.getApiClient());

            // Read operations - no wallet JWT needed
            var accounts = evmApi.listEvmAccounts(null, null, null);

            // Write operations - generate wallet JWT
            var request = new CreateEvmAccountRequest().name("my-account");
            String walletJwt = cdp.generateWalletJwt("POST", "/v2/evm/accounts", request);
            var account = evmApi.createEvmAccount(walletJwt, null, request);
        }
    }
}
```

## Troubleshooting

### "No .env file found"

Make sure you've copied `.env.example` to `.env` and configured your credentials.

### "Wallet secret is required"

Write operations (creating accounts, signing, etc.) require the `CDP_WALLET_SECRET` to be set.

### Build Issues

If you encounter build issues, try:

```bash
# Clean and rebuild
./gradlew clean build

# If using local SDK, rebuild it first
cd ../../java && ./gradlew build
```

## Learn More

- [CDP Documentation](https://docs.cdp.coinbase.com)
- [API Reference](https://docs.cdp.coinbase.com/api-reference)
- [Java SDK README](../../java/README.md)
