# CDP Java SDK

The official Java SDK for the [Coinbase Developer Platform (CDP)](https://docs.cdp.coinbase.com).

## Requirements

- Java 17 or higher
- Gradle 8.x (included via wrapper)

## Installation

### Gradle

```kotlin
dependencies {
    implementation("com.coinbase:cdp-sdk:0.1.0")
}
```

### Maven

```xml
<dependency>
    <groupId>com.coinbase</groupId>
    <artifactId>cdp-sdk</artifactId>
    <version>0.1.0</version>
</dependency>
```

## Quick Start

### API Keys

Set your API keys as environment variables:

```bash
export CDP_API_KEY_ID=your-api-key-id
export CDP_API_KEY_SECRET=your-api-key-secret
export CDP_WALLET_SECRET=your-wallet-secret  # Required for write operations
```

### Basic Usage

The SDK provides a factory that creates a configured `ApiClient` for use with the generated OpenAPI API classes:

```java
import com.coinbase.cdp.CdpClient;
import com.coinbase.cdp.openapi.api.EvmAccountsApi;
import com.coinbase.cdp.openapi.api.SolanaAccountsApi;
import com.coinbase.cdp.openapi.model.CreateEvmAccountRequest;

public class Example {
    public static void main(String[] args) throws Exception {
        // Create client from environment variables
        try (CdpClient cdp = CdpClient.create()) {
            // Get the configured ApiClient
            var apiClient = cdp.getApiClient();
            
            // Use generated API classes directly
            EvmAccountsApi evmApi = new EvmAccountsApi(apiClient);
            
            // Read operations - straightforward
            var accounts = evmApi.listEvmAccounts(null, null, null);
            System.out.println("Total accounts: " + accounts.getAccounts().size());
            
            // Write operations - generate wallet JWT for X-Wallet-Auth header
            var request = new CreateEvmAccountRequest().name("my-account");
            String walletJwt = cdp.generateWalletJwt("POST", "/v2/evm/accounts", request);
            var account = evmApi.createEvmAccount(walletJwt, null, request);
            System.out.println("Created account: " + account.getAddress());
        }
    }
}
```

### With Explicit Configuration

```java
import com.coinbase.cdp.CdpClient;
import com.coinbase.cdp.CdpClientOptions;
import com.coinbase.cdp.openapi.api.EvmAccountsApi;
import com.coinbase.cdp.openapi.api.SolanaAccountsApi;
import com.coinbase.cdp.openapi.api.PolicyEngineApi;

public class Example {
    public static void main(String[] args) throws Exception {
        CdpClientOptions options = CdpClientOptions.builder()
            .apiKeyId("your-api-key-id")
            .apiKeySecret("your-api-key-secret")
            .walletSecret("your-wallet-secret")
            .build();

        try (CdpClient cdp = CdpClient.create(options)) {
            var apiClient = cdp.getApiClient();
            
            // Create API instances
            EvmAccountsApi evmApi = new EvmAccountsApi(apiClient);
            SolanaAccountsApi solanaApi = new SolanaAccountsApi(apiClient);
            PolicyEngineApi policiesApi = new PolicyEngineApi(apiClient);
            
            // Use the APIs...
        }
    }
}
```

## JWT Generation (Public API)

The SDK exposes JWT generation utilities for custom integrations:

```java
import com.coinbase.cdp.auth.JwtGenerator;
import com.coinbase.cdp.auth.JwtOptions;
import com.coinbase.cdp.auth.WalletJwtGenerator;
import com.coinbase.cdp.auth.WalletJwtOptions;

// Generate JWT for REST API
JwtOptions options = JwtOptions.builder("key-id", "key-secret")
    .requestMethod("GET")
    .requestHost("api.cdp.coinbase.com")
    .requestPath("/platform/v1/wallets")
    .expiresIn(120)
    .build();

String jwt = JwtGenerator.generateJwt(options);

// Generate JWT for WebSocket (no URI claims)
JwtOptions wsOptions = JwtOptions.builder("key-id", "key-secret").build();
String wsJwt = JwtGenerator.generateJwt(wsOptions);

// Generate Wallet JWT for write operations
WalletJwtOptions walletOptions = new WalletJwtOptions(
    walletSecret,
    "POST",
    "api.cdp.coinbase.com",
    "/platform/v1/accounts",
    Map.of("name", "my-account")
);
String walletJwt = WalletJwtGenerator.generateWalletJwt(walletOptions);
```

## Generated API Classes

The SDK generates type-safe API bindings from the OpenAPI specification. Available API classes include:

| API Class | Purpose |
|-----------|---------|
| `EvmAccountsApi` | EVM account management (create, list, sign, etc.) |
| `EvmSmartAccountsApi` | EVM smart account operations (ERC-4337) |
| `EvmSwapsApi` | Token swap operations on EVM chains |
| `SolanaAccountsApi` | Solana account management |
| `PolicyEngineApi` | Policy management for operation controls |
| `FaucetsApi` | Request testnet funds |
| `OnchainDataApi` | Query on-chain data |

See the `com.coinbase.cdp.openapi.api` package for all available APIs.

## Features

- **Multi-blockchain support**: EVM chains and Solana
- **Server-managed accounts**: Create and manage accounts on CDP
- **Smart accounts**: ERC-4337 account abstraction support
- **Policy engine**: Define operation controls
- **Dual key support**: EC (ES256) and Ed25519 (EdDSA) authentication
- **Automatic auth**: API key JWT headers added automatically via request interceptor

## Development

### Build

```bash
make build
```

### Test

```bash
# Run unit tests
make test

# Run E2E tests (requires API credentials)
make test-e2e
```

### Lint

```bash
# Check code style
make lint

# Fix code style issues
make lint-fix
```

### Generate OpenAPI Client

```bash
make client
```

This generates the OpenAPI client from the `openapi.yaml` specification.

### Generate Documentation

```bash
make docs
```

## Architecture

The SDK follows a minimal architecture:

```
┌─────────────────────────────────────────────────────┐
│                    CdpClient                        │
│  (Factory for configured ApiClient, wallet JWT gen) │
├─────────────────────────────────────────────────────┤
│   JwtGenerator   │ WalletJwtGenerator │  KeyParser  │
│  (JWT creation and key handling)                    │
├─────────────────────────────────────────────────────┤
│              Generated OpenAPI Client               │
│  (Type-safe API bindings from openapi.yaml)         │
│  - EvmAccountsApi, SolanaAccountsApi, etc.          │
└─────────────────────────────────────────────────────┘
```

Users work directly with the generated API classes, giving them full control and direct mapping to the OpenAPI specification.

## Error Handling

The SDK provides a hierarchy of exceptions:

- `CdpException` - Base exception for all SDK errors
- `ApiException` - API-level errors with status code and error type
- `NetworkException` - Network-level failures (timeouts, DNS, etc.)
- `ValidationException` - Client-side input validation errors

```java
import com.coinbase.cdp.errors.ApiException;
import com.coinbase.cdp.errors.NetworkException;
import com.coinbase.cdp.errors.CdpException;

try {
    var account = evmApi.createEvmAccount(walletJwt, null, request);
} catch (com.coinbase.cdp.openapi.ApiException e) {
    // Handle API errors from generated client
    System.err.println("API error: " + e.getCode() + " " + e.getMessage());
}
```

## Documentation

- [API Reference](https://docs.cdp.coinbase.com/api-reference)
- [CDP SDK Documentation](https://docs.cdp.coinbase.com)
- [Javadoc](./build/docs/javadoc)

## Support

- [Discord](https://discord.com/invite/cdp)
- [GitHub Issues](https://github.com/coinbase/cdp-sdk/issues)

## License

MIT License - see [LICENSE](../LICENSE.md)
