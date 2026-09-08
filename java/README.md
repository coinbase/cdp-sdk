# CDP Java SDK

The CDP Java SDK is generated from the CDP OpenAPI definition and exposed through the canonical `com.coinbase.cdp` package.

## Installation

The Java SDK is distributed through GitHub Packages. Configure Gradle with a GitHub token that has the `read:packages` scope.

1. Add credentials to `~/.gradle/gradle.properties`:

```properties
gpr.user=YOUR_GITHUB_USERNAME
gpr.token=YOUR_GITHUB_PERSONAL_ACCESS_TOKEN
```

2. Add the GitHub Packages repository and dependency to `build.gradle.kts`:

```kotlin
repositories {
    mavenCentral()
    maven {
        url = uri("https://maven.pkg.github.com/coinbase/cdp-sdk")
        credentials {
            username = project.findProperty("gpr.user") as String? ?: System.getenv("GITHUB_ACTOR")
            password = project.findProperty("gpr.token") as String? ?: System.getenv("GITHUB_TOKEN")
        }
    }
}

dependencies {
    implementation("com.coinbase:cdp-sdk:<version>")
}
```

## Configure a client

```java
import com.coinbase.cdp.CdpClient;

CdpClient client = CdpClient.builder()
    .credentials(System.getenv("CDP_API_KEY_ID"), System.getenv("CDP_API_KEY_SECRET"))
    .walletSecret(System.getenv("CDP_WALLET_SECRET"))
    .build();
```

`CDP_WALLET_SECRET` is required only for operations that require wallet authentication. API-key-authenticated flexible custody operations do not require it.

## API resources

The client exposes API resources such as:

- `client.evmAccounts()` and `client.evmSmartAccounts()`
- `client.solanaAccounts()`
- `client.accounts()`, `client.paymentMethods()`, `client.depositDestinations()`, and `client.transfers()`
- `client.policyEngine()`, `client.endUserAccountManagement()`, and `client.endUserAccounts()`

End User Accounts operations that require end-user-only authentication are intentionally not included in this backend SDK.

## Development

```bash
# Generate the SDK from Fern
CDP_FERN_DIR=/path/to/cdp-fern make client

# Run unit tests and style checks
make test
make lint
```

Runnable usage examples are in [`../examples/java`](../examples/java).
