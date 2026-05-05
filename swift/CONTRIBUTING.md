# Swift Development Guide

This guide covers Swift-specific setup and development for the CDP SDK.

## Contents

- [Development Setup](#development-setup)
- [Updating the SDK to use a new version of the OpenAPI specification](#updating-the-sdk-to-use-a-new-version-of-the-openapi-specification)
- [Testing](#testing)
- [Example Scripts](#example-scripts)
- [Code Style](#code-style)
- [Releasing](#releasing)

## Development Setup

The CDP SDK requires Swift 5.9 or higher (Xcode 15+).

Check your Swift version:

```bash
swift --version
```

If you don't have Swift installed, download [Xcode](https://developer.apple.com/xcode/) from the Mac App Store or install the Swift toolchain from [swift.org](https://swift.org/download/).

You'll also need `swift-format` for linting and formatting:

```bash
brew install swift-format
```

Build the project:

```bash
cd swift
swift build
```

Or use the Makefile:

```bash
make build
```

## Updating the SDK to use a new version of the OpenAPI specification

The OpenAPI specification is automatically updated by the [Update OpenAPI GitHub Action](https://github.com/coinbase/cdp-sdk/actions/workflows/update_openapi.yml).

### Pull the code:

- Pull the `update_openapi` branch locally and check out the local branch
- Run `git reset --soft HEAD~1 && git commit -am "Updated OpenAPI client"` to recommit as a signed commit

### No manual wrapping required:

The Swift SDK uses Apple's [swift-openapi-generator](https://github.com/apple/swift-openapi-generator) build plugin to automatically generate types and client code from the OpenAPI specification at build time. This means:

- **No manual API wrapping** — All request/response types are auto-generated
- **No separate generation step** — Code is generated during `swift build`
- **Type safety** — All API models are strongly typed from the spec

The generated code is placed in `.build/plugins/outputs/` and is not committed to the repository.

If the OpenAPI spec changes and you want to verify generation works:

```bash
make generate
```

### Adding new functionality:

When adding new SDK features that wrap generated API calls, focus on:

1. **Client methods** — Add EVM operations in `Sources/CDPSDK/Client/Evm/EvmClient.swift` and Solana operations in `Sources/CDPSDK/Client/Solana/SolanaClient.swift`
2. **Models** — Add public-facing types in the respective `Models/` directories
3. **Error handling** — Map API errors to `CdpError` cases in `Sources/CDPSDK/Errors/`
4. **Tests** — Add unit tests in `Tests/CDPSDKTests/` and E2E tests in `Tests/CDPSDKE2ETests/`

Follow these conventions when wrapping a generated API call:

```swift
// Generated API call (internal):
// client.createEvmAccount(.init(body: .init(.json(.init(name: "foo")))))

// Public SDK method (what users call):
public func createAccount(options: CreateAccountOptions? = nil) async throws -> EvmAccount {
    let response = try await client.createEvmAccount(...)
    switch response {
    case .created(let output):
        // Map to public model
    case .badRequest(let output):
        // Map to CdpError
    // ... other cases
    }
}
```

## Testing

### Running Tests

Run unit tests:

```bash
make test
```

Run E2E tests (requires CDP credentials):

```bash
export CDP_API_KEY_ID="your-api-key-id"
export CDP_API_KEY_SECRET="your-api-key-secret"
export CDP_WALLET_SECRET="your-wallet-secret"

make test-e2e
```

### Test Structure

- **Unit tests** — Located in `Tests/CDPSDKTests/` for core functionality (JWT, key parsing, client config)
- **E2E tests** — Located in `Tests/CDPSDKE2ETests/` for live API integration testing
- **Examples** — Located in `../examples/swift/` and serve as additional integration validation

### Writing Tests

Use Swift Testing framework (`@Test`, `#expect`):

```swift
import Testing
@testable import CDPSDK

@Suite("My Feature Tests")
struct MyFeatureTests {
    @Test("Feature does X when given Y")
    func featureDoesX() async throws {
        let result = try await someOperation()
        #expect(result.value == expected)
    }
}
```

## Example Scripts

The CDP SDK includes runnable examples in `../examples/swift/`. Each example is a standalone executable target.

Available examples:

- `EVMCreateAccount` — Create EVM accounts
- `EVMGetAccount` — Retrieve EVM accounts by address/name
- `EVMGetOrCreateAccount` — Idempotent account creation
- `EVMListAccounts` — List accounts with pagination
- `EVMSignHash` — Sign arbitrary hashes
- `EVMSignMessage` — Sign EIP-191 messages
- `EVMSignTransaction` — Sign RLP-encoded transactions
- `EVMSendTransaction` — Send transactions on-chain
- `EVMSmartAccount` — Create and manage smart accounts
- `EVMRequestFaucet` — Request testnet tokens
- `SolanaCreateAccount` — Create Solana accounts
- `SolanaGetOrCreateAccount` — Idempotent Solana account creation
- `SolanaListAccounts` — List Solana accounts
- `SolanaSignMessage` — Sign Solana messages
- `SolanaSignTransaction` — Sign Solana transactions
- `SolanaRequestFaucet` — Request Solana devnet tokens

Run any example:

```bash
cd examples/swift
swift run EVMCreateAccount
```

When you make changes to the SDK code, your changes will automatically take effect when you run an example (the example package references the SDK via a local path dependency).

## Code Style

We use `swift-format` for formatting and linting:

```bash
# Format code (auto-fix)
make format

# Check formatting (strict, for CI — fails on issues)
make format-check

# Lint (non-strict, shows warnings)
make lint

# Fix lint issues
make lint-fix
```

### Swift-Specific Guidelines

- Follow [Swift API Design Guidelines](https://www.swift.org/documentation/api-design-guidelines/)
- Use `async/await` for all asynchronous operations
- Mark types as `Sendable` where appropriate for concurrency safety
- Use `struct` over `class` unless reference semantics are required
- Document all public APIs with `///` doc comments
- Prefer `let` over `var` — use `var` only when mutation is needed
- Use `guard` for early returns and precondition validation
- Name options structs consistently: `CreateAccountOptions`, `SignHashOptions`, etc.

### Code Organization

```
swift/Sources/
├── CDPAuth/               # Standalone auth module (no OpenAPI dependency)
│   ├── JwtGenerator.swift
│   ├── KeyParser.swift
│   └── Signers/
├── CDPSDK/                # Full SDK client
│   ├── Client/
│   │   ├── CdpClient.swift
│   │   ├── CdpClientOptions.swift
│   │   ├── Evm/
│   │   │   ├── EvmClient.swift
│   │   │   └── Models/
│   │   └── Solana/
│   │       ├── SolanaClient.swift
│   │       └── Models/
│   ├── Errors/
│   │   ├── CdpError.swift
│   │   └── APIError.swift
│   └── OpenAPI/           # Generator config + spec symlink
```

## Releasing

The Swift SDK is distributed via Swift Package Manager (SPM). There is no registry upload — SPM resolves packages directly from git tags.

### Release Process

1. Ensure all changes are merged to `main` and CI is green.
2. Verify tests pass locally:
   ```bash
   make test
   ```
3. Go to the [Publish cdp-sdk (Swift)](https://github.com/coinbase/cdp-sdk/actions/workflows/swift_publish.yml) workflow in GitHub Actions.
4. Click "Run workflow" and enter the version number in semver format (e.g., `0.2.0`).

The workflow will:
- Validate the version format (must match `X.Y.Z`)
- Build in release configuration
- Run all tests
- Create and push the git tag `cdp-sdk-swift@v<version>`

### Version Conventions

- **Patch** (`0.1.1`) — Bug fixes, no API changes
- **Minor** (`0.2.0`) — New features, backward-compatible additions
- **Major** (`1.0.0`) — Breaking API changes

### Consumer Usage After Release

Once tagged, consumers can reference the new version:

```swift
// Package.swift
dependencies: [
    .package(url: "https://github.com/coinbase/cdp-sdk", from: "0.2.0"),
]
```

SPM will resolve the appropriate tag automatically.
