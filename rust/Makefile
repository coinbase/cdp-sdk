# Makefile for Coinbase CDP Rust SDK

.PHONY: help client clean build test lint format check docs install

# Default target
help:
	@echo "Available targets:"
	@echo "  client     - Generate Rust client from OpenAPI spec"
	@echo "  clean      - Remove generated files and build artifacts"
	@echo "  build      - Build the project"
	@echo "  test       - Run tests"
	@echo "  lint       - Run clippy linter"
	@echo "  format     - Format code with rustfmt"
	@echo "  check      - Run cargo check"
	@echo "  docs       - Generate documentation"
	@echo "  install    - Install the package locally"

# Generate Rust client from OpenAPI specification
client:
	@echo "Generating Rust client from OpenAPI spec..."
	rm -rf ./src/apis
	rm -rf ./src/models
	openapi-generator generate -i ../openapi.yaml -g rust -o ./tmp --additional-properties=packageName=openapi-client,supportAsync=true,useSingleRequestParameter=true,supportMiddleware=true
	mv ./tmp/src/apis ./src/
	mv ./tmp/src/models ./src/
	rm -rf tmp
	@echo "Client generation complete!"

# Clean generated files and build artifacts
clean:
	@echo "Cleaning build artifacts..."
	cargo clean
	@echo "Clean complete!"

# Build the project
build:
	@echo "Building Rust SDK..."
	cargo build
	@echo "Build complete!"

# Build in release mode
build-release:
	@echo "Building Rust SDK in release mode..."
	cargo build --release
	@echo "Release build complete!"

# Run tests
test:
	@echo "Running tests..."
	cargo test
	@echo "Tests complete!"

# Run clippy linter
lint:
	@echo "Running clippy linter..."
	cargo clippy -- -D warnings
	@echo "Linting complete!"

# Fix linting issues
lint-fix:
	@echo "Fixing linting issues..."
	cargo clippy --fix --allow-dirty --allow-staged
	@echo "Lint fixes complete!"

# Format code
format:
	@echo "Formatting code..."
	cargo fmt
	@echo "Formatting complete!"

# Check code formatting
format-check:
	@echo "Checking code formatting..."
	cargo fmt -- --check
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
