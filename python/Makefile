OPENAPI_GENERATOR_VERSION = 7.11.0

.PHONY: build
build:
	uv build

.PHONY: format
format:
	uv run ruff format --exclude "cdp/openapi_client/api/*" --exclude "cdp/openapi_client/models/*" --exclude "cdp/openapi_client/test/*" --exclude "cdp/openapi_client/api_client.py" --exclude "cdp/openapi_client/configuration.py" . || (echo "Error: Failed to format code" && exit 1)

.PHONY: format-check
format-check:
	uv run ruff format --check --exclude "cdp/openapi_client/api/*" --exclude "cdp/openapi_client/models/*" --exclude "cdp/openapi_client/test/*" --exclude "cdp/openapi_client/api_client.py" --exclude "cdp/openapi_client/configuration.py" . || (echo "Error: Failed to format code" && exit 1)

.PHONY: lint
lint:
	uv run ruff check --exclude "cdp/openapi_client/api/*" --exclude "cdp/openapi_client/models/*" --exclude "cdp/openapi_client/test/*" --exclude "cdp/openapi_client/api_client.py" --exclude "cdp/openapi_client/configuration.py" . || (echo "Error: Linting failed" && exit 1)

.PHONY: lint-fix
lint-fix:
	uv run ruff check --exclude "cdp/openapi_client/api/*" --exclude "cdp/openapi_client/models/*" --exclude "cdp/openapi_client/test/*" --exclude "cdp/openapi_client/api_client.py" --exclude "cdp/openapi_client/configuration.py" --fix . || (echo "Error: Auto-fix failed" && exit 1)

.PHONY: docs
docs:
	uv run sphinx-apidoc -f -o docs/ ./cdp/ || (echo "Error: Failed to build docs" && exit 1)

.PHONY: local-docs
local-docs: docs
	cd docs && make html && open ./_build/html/index.html || (echo "Error: Failed to open local docs" && exit 1)

.PHONY: install
install:
	@if [ ! -d ".venv" ]; then \
		echo "Creating virtual environment with uv..."; \
		uv venv || (echo "Error: Failed to create virtual environment" && exit 1); \
		echo "Virtual environment created successfully at .venv"; \
	fi
	uv pip install -e ".[dev]" || (echo "Error: Failed to install dependencies" && exit 1)

# Python 3.10 has some mocking bugs in pytests, so we skip those tests
.PHONY: test-3.10
test-3.10:
	uv pip install ".[dev]" && DISABLE_CDP_ERROR_REPORTING=true uv run pytest -k "not test_e2e.py and not test_wait_for_fund_operation_receipt.py" || (echo "Error: Tests failed" && exit 1)

.PHONY: test
test:
	uv pip install ".[dev]" && DISABLE_CDP_ERROR_REPORTING=true uv run pytest -k "not test_e2e.py" || (echo "Error: Tests failed" && exit 1)

.PHONY: e2e
e2e:
	uv pip install ".[dev]" && DISABLE_CDP_ERROR_REPORTING=true uv run pytest cdp/test/test_e2e.py -v || (echo "Error: E2E Tests failed" && exit 1)

.PHONY: setup
setup:
	which uv > /dev/null || pip install uv || (echo "Error: Failed to install uv" && exit 1)

.PHONY: verify-env
verify-env:
	@echo "Checking Python environment..."
	@uv --version || (echo "Error: uv is not installed" && exit 1)
	@python --version || (echo "Error: Python is not available" && exit 1)

.PHONY: clean
clean:
	@echo "Cleaning build artifacts..."
	rm -rf .venv build dist *.egg-info __pycache__ .pytest_cache .ruff_cache
	find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true

.PHONY: python-client preprocess-openapi check-openapi
preprocess-openapi:
	@echo "Preprocessing OpenAPI spec to make X-Wallet-Auth optional..."
	@python ../scripts/preprocess_openapi.py ../openapi.yaml ../openapi_preprocessed.yaml

check-openapi:
	@make -C .. check-openapi || echo "NOTE: THERE IS A NEW OPENAPI FILE AVAILABLE. RUN 'make update-openapi' IN THE ROOT DIRECTORY TO UPDATE IT."

python-client: check-openapi preprocess-openapi
	@ command -v openapi-generator >/dev/null 2>&1 || { echo "Error: openapi-generator is not installed. Please install it first."; exit 1; }
	@ found_version=$$(openapi-generator version); [ "$$found_version" = "$(OPENAPI_GENERATOR_VERSION)" ] || { echo "Error: openapi-generator version must be $(OPENAPI_GENERATOR_VERSION), found $$found_version"; exit 1; }
	@ echo "Cleaning old API and model files..."
	@ rm -rf cdp/openapi_client/api
	@ rm -rf cdp/openapi_client/models
	@ rm -rf cdp/openapi_client/test
	@ echo "Generating new client..."
	@ openapi-generator generate -i ../openapi_preprocessed.yaml -g python -o cdp/openapi_client -c client_config.yaml -t templates --legacy-discriminator-behavior
	@ if [ -d "cdp/openapi_client/cdp/openapi_client" ]; then cp -R cdp/openapi_client/cdp/openapi_client/* cdp/openapi_client/ && rm -rf cdp/openapi_client/cdp; fi
	@ rm -rf cdp/openapi_client/docs
	@ echo "OpenAPI client generation completed"
