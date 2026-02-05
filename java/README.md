# CDP Java SDK

The official Java SDK for the [Coinbase Developer Platform (CDP)](https://docs.cdp.coinbase.com).

## Table of Contents

- [Installation](#installation)
- [API Keys](#api-keys)
- [Usage](#usage)
  - [Initialization](#initialization)
  - [Client Lifecycle](#client-lifecycle)
  - [Creating Accounts](#creating-accounts)
  - [Testnet Faucet](#testnet-faucet)
  - [Signing Messages](#signing-messages)
  - [Transferring Tokens](#transferring-tokens)
- [HTTP Retry Configuration](#http-retry-configuration)
- [TokenProvider Pattern](#tokenprovider-pattern)
- [Low-Level API Access](#low-level-api-access)
- [Authentication Tools](#authentication-tools)
- [Error Handling](#error-handling)
- [Development](#development)
- [Documentation](#documentation)
- [Support](#support)
- [License](#license)

## Requirements

- Java 21 or higher
- Gradle 8.x (included via wrapper)

## Installation

### Gradle (Kotlin DSL)

```kotlin
dependencies {
    implementation("com.coinbase:cdp-sdk:0.1.0")
}
```

### Gradle (Groovy DSL)

```groovy
dependencies {
    implementation 'com.coinbase:cdp-sdk:0.1.0'
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

## API Keys

To start, [create a CDP API Key](https://portal.cdp.coinbase.com/access/api). Save the `API Key ID` and `API Key Secret` for use in the SDK. You will also need to create a wallet secret in the Portal to sign transactions.

## Usage

### Initialization

#### From environment variables

Set your API keys as environment variables:

```bash
export CDP_API_KEY_ID="your-api-key-id"
export CDP_API_KEY_SECRET="your-api-key-secret"
export CDP_WALLET_SECRET="your-wallet-secret"  # Required for write operations
```

Then initialize the client:

```java
import com.coinbase.cdp.CdpClient;

try (CdpClient cdp = CdpClient.create()) {
    var account = cdp.evm().createAccount(
        new CreateEvmAccountRequest().name("my-account")
    );
    System.out.println("Created account: " + account.getAddress());
}
```

#### With explicit credentials

```java
import com.coinbase.cdp.CdpClient;

try (CdpClient cdp = CdpClient.builder()
        .credentials("your-api-key-id", "your-api-key-secret")
        .walletSecret("your-wallet-secret")
        .build()) {
    var account = cdp.evm().createAccount(
        new CreateEvmAccountRequest().name("my-account")
    );
}
```

#### With CdpClientOptions

For more configuration options:

```java
import com.coinbase.cdp.CdpClient;
import com.coinbase.cdp.CdpClientOptions;

CdpClientOptions options = CdpClientOptions.builder()
    .apiKeyId("your-api-key-id")
    .apiKeySecret("your-api-key-secret")
    .walletSecret("your-wallet-secret")
    .debugging(true)  // Enable debug logging
    .build();

try (CdpClient cdp = CdpClient.create(options)) {
    // Use the client...
}
```

### Client Lifecycle

The CDP client wraps an HTTP client and should be created once and reused throughout your application's lifecycle. Use try-with-resources to ensure proper cleanup:

```java
try (CdpClient cdp = CdpClient.create()) {
    // Use cdp throughout your application
}
```

- **Long-lived services**: Create a single client instance at startup
- **Serverless/request-based runtimes**: Create once per cold start
- **Concurrency**: The client is safe to use across concurrent operations

### Creating Accounts

#### Create an EVM account

```java
import com.coinbase.cdp.openapi.model.CreateEvmAccountRequest;

var account = cdp.evm().createAccount(
    new CreateEvmAccountRequest().name("my-evm-account")
);
System.out.println("Address: " + account.getAddress());
```

#### Create a Solana account

```java
import com.coinbase.cdp.openapi.model.CreateSolanaAccountRequest;

var account = cdp.solana().createAccount(
    new CreateSolanaAccountRequest().name("my-solana-account")
);
System.out.println("Address: " + account.getAddress());
```

#### List accounts

```java
// List EVM accounts
var evmAccounts = cdp.evm().listAccounts();
System.out.println("EVM accounts: " + evmAccounts.getAccounts().size());

// List Solana accounts
var solanaAccounts = cdp.solana().listAccounts();
System.out.println("Solana accounts: " + solanaAccounts.getAccounts().size());
```

#### Get an account by address

```java
var account = cdp.evm().getAccount("0x1234...");
System.out.println("Account name: " + account.getName());
```

### Testnet Faucet

Request testnet tokens for development:

#### Request testnet ETH

```java
import com.coinbase.cdp.openapi.model.RequestEvmFaucetRequest;
import com.coinbase.cdp.openapi.model.RequestEvmFaucetRequest.NetworkEnum;
import com.coinbase.cdp.openapi.model.RequestEvmFaucetRequest.TokenEnum;

var response = cdp.evm().requestFaucet(
    new RequestEvmFaucetRequest()
        .address(account.getAddress())
        .network(NetworkEnum.BASE_SEPOLIA)
        .token(TokenEnum.ETH)
);
System.out.println("Faucet tx: " + response.getTransactionHash());
```

#### Request testnet USDC

```java
var response = cdp.evm().requestFaucet(
    new RequestEvmFaucetRequest()
        .address(account.getAddress())
        .network(NetworkEnum.BASE_SEPOLIA)
        .token(TokenEnum.USDC)
);
```

### Signing Messages

#### Sign a message

```java
import com.coinbase.cdp.openapi.model.SignEvmMessageRequest;

var response = cdp.evm().signMessage(
    account.getAddress(),
    new SignEvmMessageRequest().message("Hello, CDP!")
);
System.out.println("Signature: " + response.getSignature());
```

#### Sign EIP-712 typed data

```java
import com.coinbase.cdp.openapi.model.EIP712Domain;
import com.coinbase.cdp.openapi.model.EIP712Message;

EIP712Domain domain = new EIP712Domain()
    .name("MyDApp")
    .version("1")
    .chainId(1L)
    .verifyingContract("0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC");

Map<String, Object> types = Map.of(
    "Person", List.of(
        Map.of("name", "name", "type", "string"),
        Map.of("name", "wallet", "type", "address")
    )
);

Map<String, Object> message = Map.of(
    "name", "Alice",
    "wallet", account.getAddress()
);

EIP712Message eip712Message = new EIP712Message()
    .domain(domain)
    .types(types)
    .primaryType("Person")
    .message(message);

var response = cdp.evm().signTypedData(account.getAddress(), eip712Message);
System.out.println("Signature: " + response.getSignature());
```

### Transferring Tokens

#### Transfer USDC on EVM

```java
import com.coinbase.cdp.client.evm.EvmClientOptions.TransferOptions;
import com.coinbase.cdp.openapi.model.SendEvmTransactionRequest.NetworkEnum;
import java.math.BigInteger;

var result = cdp.evm().transfer(
    sender.getAddress(),
    TransferOptions.builder()
        .to(receiver.getAddress())
        .amount(new BigInteger("10000"))  // 0.01 USDC (6 decimals)
        .token("usdc")
        .network(NetworkEnum.BASE_SEPOLIA)
        .build()
);

System.out.println("Transaction: " + result.getTransactionHash());
System.out.println("Explorer: https://sepolia.basescan.org/tx/" + result.getTransactionHash());
```

#### Transfer SOL on Solana

```java
import com.coinbase.cdp.client.solana.SolanaClientOptions.TransferOptions;
import com.coinbase.cdp.openapi.model.SendSolanaTransactionRequest.NetworkEnum;
import java.math.BigInteger;

var result = cdp.solana().transfer(
    sender.getAddress(),
    TransferOptions.builder()
        .to(receiver.getAddress())
        .amount(new BigInteger("10000000"))  // 0.01 SOL (9 decimals)
        .token("sol")
        .network(NetworkEnum.SOLANA_DEVNET)
        .build()
);

System.out.println("Signature: " + result.getSignature());
```

## HTTP Retry Configuration

The SDK supports configurable HTTP retry behavior with exponential backoff and jitter for handling transient failures and rate limiting.

#### Default retry configuration

```java
import com.coinbase.cdp.http.RetryConfig;

// Default: 3 retries, 100ms initial backoff, 30s max, 2x multiplier, 25% jitter
RetryConfig config = RetryConfig.defaultConfig();
```

#### Custom retry configuration

```java
import com.coinbase.cdp.http.RetryConfig;
import java.time.Duration;

RetryConfig retryConfig = RetryConfig.builder()
    .maxRetries(5)
    .initialBackoff(Duration.ofMillis(200))
    .maxBackoff(Duration.ofSeconds(60))
    .backoffMultiplier(2.0)
    .jitterFactor(0.3)
    .build();

try (CdpClient cdp = CdpClient.builder()
        .credentials("api-key-id", "api-key-secret")
        .retryConfig(retryConfig)
        .build()) {
    // Requests will retry with custom backoff
}
```

#### Disable retries

```java
RetryConfig noRetries = RetryConfig.disabled();

CdpClientOptions options = CdpClientOptions.builder()
    .apiKeyId("api-key-id")
    .apiKeySecret("api-key-secret")
    .retryConfig(noRetries)
    .build();
```

#### Retryable status codes

By default, the SDK retries on these status codes:
- `429` - Rate limiting
- `500`, `502`, `503`, `504` - Server errors

## TokenProvider Pattern

For serverless or edge deployments where you want to generate tokens separately from making API calls, use the `TokenProvider` pattern:

```java
import com.coinbase.cdp.auth.CdpTokenGenerator;
import com.coinbase.cdp.auth.CdpTokenRequest;
import com.coinbase.cdp.auth.TokenProvider;

// Create a token generator (typically on your backend)
CdpTokenGenerator tokenGenerator = new CdpTokenGenerator(
    apiKeyId, apiKeySecret, Optional.of(walletSecret)
);

// Generate tokens for a specific request
CdpTokenRequest tokenRequest = CdpTokenRequest.builder()
    .requestMethod("POST")
    .requestPath("/platform/v2/evm/accounts")
    .requestHost("api.cdp.coinbase.com")
    .includeWalletAuthToken(true)
    .requestBody(new CreateEvmAccountRequest().name("my-account"))
    .build();

TokenProvider tokens = tokenGenerator.generateTokens(tokenRequest);

// Use tokens with the client (typically on the edge/client)
try (CdpClient cdp = CdpClient.builder()
        .tokenProvider(tokens)
        .build()) {
    var account = cdp.evm().createAccount(
        new CreateEvmAccountRequest().name("my-account")
    );
}
```

**Important:** Wallet JWTs are request-specific. Each write operation needs its own `TokenProvider` because the wallet JWT includes the HTTP method, path, and body hash.

## Low-Level API Access

For advanced use cases, you can access the generated OpenAPI classes directly:

```java
import com.coinbase.cdp.openapi.api.EvmAccountsApi;
import com.coinbase.cdp.openapi.api.SolanaAccountsApi;
import com.coinbase.cdp.openapi.api.PolicyEngineApi;

try (CdpClient cdp = CdpClient.create()) {
    // Get the configured ApiClient
    var apiClient = cdp.getApiClient();

    // Create API instances
    EvmAccountsApi evmApi = new EvmAccountsApi(apiClient);
    SolanaAccountsApi solanaApi = new SolanaAccountsApi(apiClient);
    PolicyEngineApi policiesApi = new PolicyEngineApi(apiClient);

    // Read operations
    var accounts = evmApi.listEvmAccounts(null, null, null);

    // Write operations require wallet JWT
    var request = new CreateEvmAccountRequest().name("my-account");
    String walletJwt = cdp.generateWalletJwt("POST", "/v2/evm/accounts", request);
    var account = evmApi.createEvmAccount(walletJwt, null, request);
}
```

### Available API Classes

| API Class | Purpose |
|-----------|---------|
| `EvmAccountsApi` | EVM account management (create, list, sign) |
| `EvmSmartAccountsApi` | EVM smart account operations (ERC-4337) |
| `EvmSwapsApi` | Token swap operations on EVM chains |
| `SolanaAccountsApi` | Solana account management |
| `PolicyEngineApi` | Policy management for operation controls |
| `FaucetsApi` | Request testnet funds |
| `OnchainDataApi` | Query on-chain data |

See the `com.coinbase.cdp.openapi.api` package for all available APIs.

## Authentication Tools

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
    .requestPath("/platform/v2/evm/accounts")
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
    "/platform/v2/evm/accounts",
    Map.of("name", "my-account")
);
String walletJwt = WalletJwtGenerator.generateWalletJwt(walletOptions);
```

## Error Handling

The SDK uses exceptions from the generated OpenAPI client:

```java
try {
    var account = cdp.evm().createAccount(
        new CreateEvmAccountRequest().name("my-account")
    );
} catch (com.coinbase.cdp.openapi.ApiException e) {
    System.err.println("API error: " + e.getCode() + " - " + e.getMessage());
    System.err.println("Response body: " + e.getResponseBody());
}
```

## Features

- **Multi-blockchain support**: EVM chains and Solana
- **High-level API**: Namespace clients (`cdp.evm()`, `cdp.solana()`, `cdp.policies()`)
- **Server-managed accounts**: Create and manage accounts on CDP
- **Smart accounts**: ERC-4337 account abstraction support
- **Policy engine**: Define operation controls
- **Dual key support**: EC (ES256) and Ed25519 (EdDSA) authentication
- **Automatic auth**: API key JWT headers added automatically
- **Configurable retries**: Exponential backoff with jitter
- **TokenProvider pattern**: Flexible authentication for serverless deployments

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

### Generate Documentation

```bash
make docs
```

## Examples

Working examples are available in the [`examples/java`](../examples/java) directory:

| Task | Command |
|------|---------|
| Quickstart | `./gradlew runQuickstart` |
| Create EVM account | `./gradlew runCreateEvmAccount` |
| List EVM accounts | `./gradlew runListEvmAccounts` |
| Sign message | `./gradlew runSignMessage` |
| Request faucet | `./gradlew runRequestFaucet` |
| Transfer tokens | `./gradlew runTransfer` |
| TokenProvider pattern | `./gradlew runSignTypedDataWithTokenProvider` |
| Retry configuration | `./gradlew runRetryConfiguration` |
| Create Solana account | `./gradlew runCreateSolanaAccount` |
| Solana transfer | `./gradlew runSolanaTransfer` |

Run `./gradlew listExamples` for the full list.

## Documentation

- [API Reference](https://docs.cdp.coinbase.com/api-v2/docs/welcome)
- [CDP SDK Documentation](https://docs.cdp.coinbase.com)
- [Javadoc](./build/docs/javadoc)

## Support

- [Discord](https://discord.com/invite/cdp)
- [GitHub Issues](https://github.com/coinbase/cdp-sdk/issues)

## License

MIT License - see [LICENSE](../LICENSE.md)
