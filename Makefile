.PHONY: update-openapi check-openapi-updated generate-all-clients help \
	x402-fmt x402-fmt-go x402-fmt-python x402-fmt-ts \
	x402-lint x402-lint-go x402-lint-python x402-lint-ts \
	x402-typecheck-python \
	x402-test x402-test-go x402-test-python x402-test-ts x402-test-e2e \
	x402-verify x402-verify-go x402-verify-python x402-verify-ts \
	x402-deps-dev x402-deps-dev-go x402-deps-dev-python x402-deps-dev-ts \
	x402-docs-index x402-docs-index-check

# The timestamp ensures all requests are unique and the latest spec is fetched.
OPENAPI_URL := https://drla6sbl8l00t.cloudfront.net/openapi.yaml?timestamp=$(shell date +%s)
OPENAPI_LOCAL := openapi.yaml
OPENAPI_TEMP := openapi.yaml.new

help:
	@echo "Available commands:"
	@echo "  make update-openapi      - Download the latest OpenAPI spec from the CDN"
	@echo "  make check-openapi       - Check if a newer OpenAPI spec is available"
	@echo "  make generate-all-clients - Generate clients for all languages"

generate-all-clients:
	@echo "Generating TypeScript client..."
	@cd typescript && npm run orval
	@echo "Generating Python client..."
	@cd python && make python-client
	@echo "Generating Rust client..."
	@cd rust && make generate && make format
	@echo "Generating Go client..."
	@cd go && make client
	@echo "Generating Java client..."
	@cd java && make client
	@echo "All clients generated successfully!"

update-openapi:
	@echo "Downloading latest OpenAPI spec from $(OPENAPI_URL)..."
	@curl -s -o $(OPENAPI_TEMP) $(OPENAPI_URL)
	@if [ ! -f $(OPENAPI_LOCAL) ] || ! cmp -s $(OPENAPI_TEMP) $(OPENAPI_LOCAL); then \
		mv $(OPENAPI_TEMP) $(OPENAPI_LOCAL); \
		echo "OpenAPI spec updated successfully."; \
	else \
		rm $(OPENAPI_TEMP); \
		echo "OpenAPI spec is already up to date."; \
	fi

check-openapi:
	@echo "Checking for OpenAPI updates..."
	@curl -s -o $(OPENAPI_TEMP) $(OPENAPI_URL)
	@if [ ! -f $(OPENAPI_LOCAL) ] || ! cmp -s $(OPENAPI_TEMP) $(OPENAPI_LOCAL); then \
		echo "A newer OpenAPI spec is available. Run 'make update-openapi' to update."; \
		rm $(OPENAPI_TEMP); \
	else \
		echo "OpenAPI spec is up to date."; \
		rm $(OPENAPI_TEMP); \
		exit 0; \
	fi

# ============================================================
# x402 — Format
# ============================================================

## x402-fmt: format all x402 SDKs
x402-fmt: x402-fmt-go x402-fmt-python x402-fmt-ts

## x402-fmt-go: format Go with goimports (covers go/x402/)
x402-fmt-go:
	cd go && goimports -w .

## x402-fmt-python: format Python x402 with ruff
x402-fmt-python:
	cd python/x402 && uv run ruff format .

## x402-fmt-ts: format TypeScript x402 packages with Prettier
x402-fmt-ts:
	pnpm --dir typescript --filter "@coinbase/x402" --filter "@coinbase/x402-express" \
		--filter "@coinbase/x402-hono" --filter "@coinbase/x402-next" run format

# ============================================================
# x402 — Lint
# ============================================================

## x402-lint: lint all x402 SDKs
x402-lint: x402-lint-go x402-lint-python x402-lint-ts x402-typecheck-python

## x402-lint-go: lint Go with golangci-lint (covers go/x402/)
x402-lint-go:
	cd go && golangci-lint run ./x402/...

## x402-lint-python: lint Python x402 with ruff
x402-lint-python:
	cd python/x402 && uv run ruff check .

## x402-lint-ts: lint TypeScript x402 packages with ESLint
x402-lint-ts:
	pnpm --dir typescript --filter "@coinbase/x402" --filter "@coinbase/x402-express" \
		--filter "@coinbase/x402-hono" --filter "@coinbase/x402-next" run lint:check

## x402-typecheck-python: type-check Python x402 with mypy
x402-typecheck-python:
	cd python/x402 && uv run mypy cdp_x402/ --strict

# ============================================================
# x402 — Test
# ============================================================

## x402-test: run x402 unit tests for all languages
x402-test: x402-test-go x402-test-python x402-test-ts

## x402-test-go: run Go x402 tests with race detector and coverage
x402-test-go:
	cd go && go test -race -cover ./x402/...

## x402-test-python: run Python x402 tests
x402-test-python:
	cd python/x402 && uv run pytest

## x402-test-ts: build and run TypeScript x402 tests
x402-test-ts:
	pnpm --dir typescript --filter "@coinbase/x402" --filter "@coinbase/x402-express" \
		--filter "@coinbase/x402-hono" --filter "@coinbase/x402-next" run build
	pnpm --dir typescript --filter "@coinbase/x402" --filter "@coinbase/x402-express" \
		--filter "@coinbase/x402-hono" --filter "@coinbase/x402-next" run test

## x402-test-e2e: run x402 e2e tests (requires credentials in go/x402/e2e/.env)
x402-test-e2e:
	pnpm --dir typescript/packages/x402 run test:e2e
	cd python/x402 && uv run pytest e2e/

# ============================================================
# x402 — Verify (fmt + lint + typecheck + test)
# ============================================================

## x402-verify: run all checks for all x402 SDKs
x402-verify: x402-fmt x402-lint x402-typecheck-python x402-test

## x402-verify-go: run all Go x402 checks
x402-verify-go: x402-fmt-go x402-lint-go x402-test-go

## x402-verify-python: run all Python x402 checks
x402-verify-python: x402-fmt-python x402-lint-python x402-typecheck-python x402-test-python

## x402-verify-ts: run all TypeScript x402 checks
x402-verify-ts: x402-fmt-ts x402-lint-ts x402-test-ts

# ============================================================
# x402 — Docs index
# ============================================================

## x402-docs-index: regenerate the @coinbase/x402 README docs index
x402-docs-index:
	node scripts/update-docs-index.mjs
	@echo "Run from typescript/packages/x402/ or set CWD there for README + docs/ paths."

## x402-docs-index-check: check the @coinbase/x402 README docs index (CI)
x402-docs-index-check:
	node scripts/update-docs-index.mjs --check

# ============================================================
# x402 — Dev dependencies
# ============================================================

## x402-deps-dev: install all x402 development tools
x402-deps-dev: x402-deps-dev-go x402-deps-dev-python x402-deps-dev-ts

## x402-deps-dev-go: install Go development tools (golangci-lint, goimports)
x402-deps-dev-go:
	go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest
	go install golang.org/x/tools/cmd/goimports@latest

## x402-deps-dev-python: install Python x402 development dependencies
x402-deps-dev-python:
	cd python/x402 && uv pip install -e ".[dev,server-fastapi,server-flask]"

## x402-deps-dev-ts: install TypeScript x402 development dependencies
x402-deps-dev-ts:
	pnpm --dir typescript install --frozen-lockfile
