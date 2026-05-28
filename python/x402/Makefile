.PHONY: build
build:
	uv build

.PHONY: format
format:
	uv run ruff format . || (echo "Error: Failed to format code" && exit 1)

.PHONY: format-check
format-check:
	uv run ruff format --check . || (echo "Error: Failed to format code" && exit 1)

.PHONY: lint
lint:
	uv run ruff check . || (echo "Error: Linting failed" && exit 1)

.PHONY: lint-fix
lint-fix:
	uv run ruff check --fix . || (echo "Error: Auto-fix failed" && exit 1)

.PHONY: install
install:
	@if [ ! -d ".venv" ]; then \
		echo "Creating virtual environment with uv..."; \
		uv venv || (echo "Error: Failed to create virtual environment" && exit 1); \
		echo "Virtual environment created successfully at .venv"; \
	fi
	uv sync --extra dev --extra server-fastapi --extra server-flask || (echo "Error: Failed to install dependencies" && exit 1)

.PHONY: test
test:
	uv sync --extra dev --extra server-fastapi --extra server-flask && uv run pytest || (echo "Error: Tests failed" && exit 1)

.PHONY: e2e
e2e:
	uv sync --extra dev --extra server-fastapi --extra server-flask && \
	uv run e2e/server_e2e.py && \
	uv run e2e/cdp_wallet_e2e.py && \
	uv run e2e/guardrails_e2e.py || (echo "Error: E2E Tests failed" && exit 1)

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
