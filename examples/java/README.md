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

### Client Initialization

There are multiple ways to initialize the CDP client:

```java
// Option 1: From environment variables (simplest)
// Reads CDP_API_KEY_ID, CDP_API_KEY_SECRET, CDP_WALLET_SECRET
CdpClient cdp = CdpClient.create();

// Option 2: With explicit credentials using the builder pattern
CdpClient cdp = CdpClient.builder()
    .credentials("api-key-id", "api-key-secret")
    .walletSecret("wallet-secret")
    .build();

// Option 3: With pre-generated tokens (for serverless/edge deployments)
CdpClient cdp = CdpClient.builder()
    .tokenProvider(myTokenProvider)
    .build();

// Option 4: With custom HTTP configuration
CdpClient cdp = CdpClient.builder()
    .credentials("api-key-id", "api-key-secret")
    .httpConfig(config -> config
        .debugging(true)
        .retryConfig(RetryConfig.builder().maxRetries(5).build()))
    .build();
```

### Basic Usage Pattern

Each example follows a consistent pattern:

```java
import com.coinbase.cdp.CdpClient;
import com.coinbase.cdp.examples.utils.EnvLoader;

public class Example {
    public static void main(String[] args) throws Exception {
        // Load .env file
        EnvLoader.load();

        try (CdpClient cdp = CdpClient.create()) {
            // Use high-level namespace clients (recommended)
            var account = cdp.evm().createAccount(
                new CreateEvmAccountRequest().name("my-account")
            );

            // Or use low-level OpenAPI clients for advanced usage
            EvmAccountsApi evmApi = new EvmAccountsApi(cdp.getApiClient());
            var accounts = evmApi.listEvmAccounts(null, null, null);
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
