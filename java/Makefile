#
# CDP Java SDK Makefile
#

OPENAPI_GENERATOR_VERSION = 7.11.0
GRADLE = ./gradlew

.PHONY: help build clean test test-e2e lint lint-fix format docs client preprocess-openapi check-openapi

help:
	@echo "Available commands:"
	@echo "  make build          - Build the SDK"
	@echo "  make clean          - Clean build artifacts"
	@echo "  make test           - Run unit tests"
	@echo "  make test-e2e       - Run E2E tests"
	@echo "  make lint           - Check code style"
	@echo "  make lint-fix       - Fix code style issues"
	@echo "  make format         - Format code (alias for lint-fix)"
	@echo "  make docs           - Generate Javadoc"
	@echo "  make client         - Generate OpenAPI client"

build:
	$(GRADLE) build -x test

clean:
	$(GRADLE) clean
	rm -rf src/main/java/com/coinbase/cdp/openapi

test:
	$(GRADLE) test

test-e2e:
	$(GRADLE) testE2E

lint:
	$(GRADLE) spotlessCheck

lint-fix:
	$(GRADLE) spotlessApply

format: lint-fix

docs:
	$(GRADLE) javadoc
	@echo "Javadoc generated in build/docs/javadoc"

preprocess-openapi:
	@echo "Preprocessing OpenAPI spec..."
	@python ../scripts/preprocess_openapi.py ../openapi.yaml ../openapi-preprocessed.yaml

check-openapi:
	@make -C .. check-openapi || echo "NOTE: THERE IS A NEW OPENAPI FILE AVAILABLE."

client: check-openapi preprocess-openapi
	@echo "Generating Java OpenAPI client..."
	@command -v openapi-generator-cli >/dev/null 2>&1 || command -v openapi-generator >/dev/null 2>&1 || { echo "Error: openapi-generator is not installed. Install with: brew install openapi-generator"; exit 1; }
	@rm -rf src/main/java/com/coinbase/cdp/openapi
	@mkdir -p src/main/java/com/coinbase/cdp/openapi
	@if command -v openapi-generator-cli >/dev/null 2>&1; then \
		openapi-generator-cli generate \
			-i ../openapi-preprocessed.yaml \
			-g java \
			-o build/generated \
			-c client_config.yaml \
			--generate-alias-as-model; \
	else \
		openapi-generator generate \
			-i ../openapi-preprocessed.yaml \
			-g java \
			-o build/generated \
			-c client_config.yaml \
			--generate-alias-as-model; \
	fi
	@cp -r build/generated/src/main/java/com/coinbase/cdp/openapi/* src/main/java/com/coinbase/cdp/openapi/
	@echo "Applying generated code fixes..."
	@./scripts/fix-generated-code.sh
	@echo "OpenAPI client generation completed"
