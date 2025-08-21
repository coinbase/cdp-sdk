# CDP SDK Rust End-to-End Tests

This directory contains end-to-end (e2e) tests for the CDP SDK Rust implementation. These tests verify the full functionality of the SDK against the actual CDP API.

## Setup

### Environment Variables

The following environment variables are required to run the e2e tests:

- `CDP_API_KEY_ID`: Your CDP API key ID
- `CDP_API_KEY_SECRET`: Your CDP API key secret
- `CDP_WALLET_SECRET`: Your wallet secret (for write operations)

Optional environment variables:

- `E2E_BASE_PATH`: Custom base URL for the CDP API (defaults to production)
- `E2E_LOGGING`: Set to "true" to enable verbose test logging
- `CDP_E2E_SKIP_EVM_TOKEN_BALANCES`: Set to "true" to skip token balance tests

### Running Tests

To run the end-to-end tests:

```bash
# Set environment variables
export CDP_API_KEY_ID="your-api-key-id"
export CDP_API_KEY_SECRET="your-api-key-secret"
export CDP_WALLET_SECRET="your-wallet-secret"

# Run all e2e tests
cargo test --test e2e

# Run specific test
cargo test --test e2e test_evm_account_crud_operations

# Run with logging enabled
E2E_LOGGING=true cargo test --test e2e
```

## Test Coverage

The e2e tests cover the following functionality:

### CdpClient Tests
- Client initialization and configuration
- Base URL validation

### EvmApi Tests
- Account CRUD operations (create, read, update, delete)

## Test Structure

The tests follow Rust testing conventions:

- Tests are located in `tests/e2e.rs` for integration testing
- Each test is marked with `#[tokio::test]` for async support
- Helper functions provide common functionality like random name generation
- Tests use the actual CDP client (not mocks) for end-to-end validation

## Environment-Specific Configuration

For testing against different environments:

```bash
# Testing against staging
E2E_BASE_PATH="https://api-staging.cdp.coinbase.com" cargo test --test e2e

# Testing with custom logging
E2E_LOGGING=true cargo test --test e2e -- --nocapture
```

## Contributing

When adding new e2e tests:

1. Follow the existing test structure and naming conventions
2. Add appropriate helper functions for reusable functionality
3. Include proper error handling and assertions
4. Add logging statements for debugging when needed
5. Update this README if new environment variables or setup steps are required
