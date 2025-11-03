# Rust Development Guide

This guide covers Rust-specific setup and development for the CDP SDK.

## Contents

- [Development Setup](#development-setup)
- [Updating the SDK to use a new version of the OpenAPI specification](#updating-the-sdk-to-use-a-new-version-of-the-openapi-specification)
- [Testing](#testing)
- [Example Scripts](#example-scripts)
- [Code Style](#code-style)

## Development Setup

The CDP SDK uses Rust 1.86 or higher.

You can run the following to check your Rust version:

```bash
rustc --version
cargo --version
```

If you don't have Rust installed, download it from [rustup.rs](https://rustup.rs/).

Then, build the project and install dependencies by running:

```bash
cargo build
```

## Updating the SDK to use a new version of the OpenAPI specification

Fronm the root of the repository, run `make update-openapi` to pull the latest version of the spec.

Then, run `cd rust` and `make generate` to regenerate `api.rs`.

### No additional wrapping required:

Unlike other SDK implementations, the Rust SDK uses [Progenitor](https://github.com/sammccord/progenitor) to automatically generate type-safe client bindings from the OpenAPI specification at build time. This means:

- **No manual API wrapping** - All client methods are automatically generated with proper types
- **No separate generation step** - The OpenAPI client is generated during `cargo build`
- **Type safety** - Request/response types are automatically derived from the OpenAPI spec

The generated client is located in `src/api.rs` and provides:
- Strongly-typed request builders (e.g., `client.create_evm_account().body(body).send()`)
- Automatic serialization/deserialization of all types
- Builder patterns for all endpoints

If you need to add new functionality, focus on:
1. **Authentication middleware** (`src/auth.rs`) - for new auth requirements
2. **Error handling** (`src/error.rs`) - for custom error types
3. **Examples** (`examples/`) - to demonstrate new features
4. **Tests** (`tests/`) - to validate new functionality

## Testing

### Running Tests

Run `make test` to run all unit tests in the SDK.

Run `make test-e2e` to run the end-to-end tests. Make sure to set the required environment variables:

```bash
export CDP_API_KEY_ID="your-api-key-id"
export CDP_API_KEY_SECRET="your-api-key-secret"
export CDP_WALLET_SECRET="your-wallet-secret"
```

You can also set `E2E_LOGGING=true` to enable detailed logging during e2e tests:

```bash
E2E_LOGGING=true make test-e2e
```

### Test Structure

- **Unit tests** - Located in `src/` modules using `#[cfg(test)]`
- **Integration tests** - Located in `tests/e2e.rs` for comprehensive API testing
- **Example validation** - Examples serve as both documentation and integration tests

## Example Scripts

The CDP SDK includes several runnable examples in the `examples/` directory:

- `evm_account_management` - EVM account CRUD operations
- `evm_signing` - EVM transaction and message signing
- `smart_account_management` - Smart account operations
- `solana_account_management` - Solana account CRUD operations
- `solana_signing` - Solana transaction and message signing
- `token_balances` - Multi-chain token balance queries

Run any example with:

```bash
cargo run --example evm_account_management
```

When you make changes to the SDK code, your changes will automatically take effect when you run an example.

## Code Style

We use `rustfmt` and `clippy` for formatting and linting:

```bash
# Format code
make format

# Lint code
make lint

# Fix linting issues
make lint-fix

# Check code without building
make check
```

### Rust-Specific Guidelines

- Follow the [Rust API Guidelines](https://rust-lang.github.io/api-guidelines/)
- Use `#[must_use]` for functions where ignoring the return value is likely a bug
- Prefer `impl Trait` over generic type parameters where appropriate
- Use `thiserror` for error types and `anyhow` for error handling in examples
- Document all public APIs with `///` comments including examples where helpful

### Code Organization

- **Generated code** (`src/api.rs`) - Do not modify directly, regenerated on build
- **Authentication** (`src/auth.rs`) - JWT generation and middleware
- **Error types** (`src/error.rs`) - Custom error handling
- **Library exports** (`src/lib.rs`) - Public API surface
- **Examples** (`examples/`) - Practical usage demonstrations
- **Tests** (`tests/`) - Integration and e2e testing
