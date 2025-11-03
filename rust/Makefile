# Makefile for Coinbase CDP Rust SDK

.PHONY: help clean build test test-unit test-e2e lint lint-fix format check docs install generate

# Default target
help:
	@echo "Available targets:"
	@echo "  generate         - Generate api.rs from openapi.yaml"
	@echo "  clean            - Remove generated files and build artifacts"
	@echo "  build            - Build the project"
	@echo "  test             - Run all tests (unit + integration)"
	@echo "  test-unit        - Run unit tests only"
	@echo "  test-e2e         - Run end-to-end tests"
	@echo "  lint             - Run clippy linter (all files)"
	@echo "  lint-fix         - Fix linting issues (all files)"
	@echo "  format           - Format code with rustfmt"
	@echo "  check            - Run cargo check"
	@echo "  docs             - Generate documentation"
	@echo "  install          - Install the package locally"

# Clean generated files and build artifacts
clean:
	@echo "Cleaning build artifacts..."
	cargo clean
	@echo "Clean complete!"

# Generate api.rs from openapi.yaml
generate:
	@echo "Generating api.rs from openapi.yaml..."
	CDP_GENERATE=1 cargo build && cargo fmt --all
	@echo "Code generation complete!"

# Build the project
build:
	@echo "Building Rust SDK..."
	cargo build && cargo fmt --all
	@echo "Build complete!"

# Build in release mode
build-release:
	@echo "Building Rust SDK in release mode..."
	cargo build --release && cargo fmt --all
	@echo "Release build complete!"

# Run all tests (unit + integration)
test:
	@echo "Running all tests..."
	cargo test
	@echo "All tests complete!"

# Run unit tests only
test-unit:
	@echo "Running unit tests..."
	cargo test --lib
	@echo "Unit tests complete!"

# Run end-to-end tests
test-e2e:
	@echo "Running end-to-end tests with verbose logging..."
	@echo "Make sure the following environment variables are set:"
	@echo "  CDP_API_KEY_ID, CDP_API_KEY_SECRET, CDP_WALLET_SECRET"
	E2E_LOGGING=true cargo test --test e2e -- --nocapture
	@echo "E2E tests complete!"

# Run clippy linter
lint:
	@echo "Running clippy linter..."
	cargo clippy --all-targets --all-features -- -D warnings
	@echo "Linting complete!"

# Fix linting issues
lint-fix:
	@echo "Fixing linting issues..."
	cargo clippy --fix --allow-dirty --allow-staged --all-features
	@echo "Lint fixes complete!"

# Format code
format:
	@echo "Formatting code..."
	cargo fmt --all
	@echo "Formatting complete!"

# Check code formatting
format-check:
	@echo "Checking code formatting..."
	cargo fmt --all -- --check
	@echo "Format check complete!"

# Run cargo check
check:
	@echo "Running cargo check..."
	cargo check
	@echo "Check complete!"

# Generate documentation
docs:
	@echo "Generating documentation..."
	cargo doc --no-deps --open
	@echo "Documentation generated!"

# Install package locally
install:
	@echo "Installing package locally..."
	cargo install --path .
	@echo "Installation complete!"

# Run all checks (check, test, lint, format-check)
verify: check test lint format-check
	@echo "All verifications passed!"

# Prepare for release (format, lint-fix, test, build)
prepare: format lint-fix test build
	@echo "Preparation complete!"

check-openapi:
	@make -C .. check-openapi || echo "NOTE: THERE IS A NEW OPENAPI FILE AVAILABLE. RUN 'make update-openapi' IN THE ROOT DIRECTORY TO UPDATE IT."
