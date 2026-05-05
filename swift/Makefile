.PHONY: help build test test-e2e lint lint-fix format format-check docs clean generate

help: ## Show this help
	@echo "Available targets:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-15s %s\n", $$1, $$2}'

build: ## Build the Swift SDK
	@echo "Building Swift SDK..."
	swift build
	@echo "Build complete!"

test: ## Run unit tests
	@echo "Running tests..."
	swift test
	@echo "Tests complete!"

test-e2e: ## Run end-to-end tests (requires CDP_API_KEY_ID, CDP_API_KEY_SECRET, CDP_WALLET_SECRET)
	@echo "Running E2E tests..."
	swift test --filter E2E
	@echo "E2E tests complete!"

lint: ## Check code formatting
	@echo "Running swift-format lint..."
	swift-format lint --recursive Sources/ Tests/
	@echo "Lint complete!"

lint-fix: ## Fix formatting issues
	@echo "Fixing lint issues..."
	swift-format format --in-place --recursive Sources/ Tests/
	@echo "Lint fix complete!"

format: ## Format code
	@echo "Formatting code..."
	swift-format format --in-place --recursive Sources/ Tests/
	@echo "Format complete!"

format-check: ## Check code formatting (CI)
	@echo "Checking formatting..."
	swift-format lint --strict --recursive Sources/ Tests/
	@echo "Format check complete!"

docs: ## Generate documentation
	@echo "Generating documentation..."
	swift package generate-documentation --target CDPSDK
	@echo "Docs generated!"

clean: ## Clean build artifacts
	@echo "Cleaning..."
	swift package clean
	rm -rf .build/
	@echo "Clean complete!"

generate: ## Copy latest openapi.yaml and rebuild
	@echo "Ensuring openapi.yaml symlink is correct..."
	@if [ ! -L Sources/CDPSDK/OpenAPI/openapi.yaml ]; then \
		ln -sf ../../../../openapi.yaml Sources/CDPSDK/OpenAPI/openapi.yaml; \
	fi
	@echo "Building (triggers OpenAPI code generation)..."
	swift build
	@echo "OpenAPI generation complete!"

check-openapi: ## Check if OpenAPI spec is up to date
	@make -C .. check-openapi || echo "NOTE: THERE IS A NEW OPENAPI FILE AVAILABLE."
