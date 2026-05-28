# Python SDK Contributing Guide

Guide for developing and contributing to the `cdp-x402` Python SDK.

## Contents

- [Repository Structure](#repository-structure)
- [Development Setup](#development-setup)
- [Development Workflow](#development-workflow)
- [Testing](#testing)
- [Code Quality](#code-quality)

## Repository Structure

```
python/x402/
├── cdp_x402/
│   ├── __init__.py             # Package root; re-exports top-level symbols
│   ├── core/
│   │   ├── __init__.py         # Core exports
│   │   ├── bazaar.py           # Bazaar client helper exports
│   │   ├── client.py           # CdpX402Client, create_cdp_x402_client
│   │   ├── constants.py        # CDP facilitator URL, paths, default networks/extensions
│   │   ├── credentials.py      # Credential resolution from env vars
│   │   ├── facilitator.py      # create_cdp_facilitator_client, create_cdp_facilitator_client_sync
│   │   ├── guardrails/
│   │   │   ├── apply.py        # apply_spend_controls - wires policies onto an x402Client
│   │   │   ├── normalize.py    # Asset/network/payee normalization helpers
│   │   │   ├── spend_tracker.py# SpendTracker, SpendStore, in-memory ledger
│   │   │   └── types.py        # Amount, SpendControls, Duration, and related types
│   │   └── wallets/
│   │       ├── _domain_utils.py# Wallet domain resolution helpers
│   │       ├── config.py       # WalletConfig, resolve_wallet_config
│   │       ├── evm_signer.py   # from_cdp_evm_account - adapts CDP EOA to x402 signer
│   │       └── scw_signer.py   # from_cdp_smart_wallet - adapts CDP SCW to x402 signer
│   └── middleware/
│       ├── _common.py          # Framework-agnostic SyncPaymentGate / AsyncPaymentGate
│       ├── flask.py            # CDPx402Flask + payment_middleware (sync)
│       └── fastapi.py          # CDPx402FastAPI + payment_middleware (async, Depends)
├── tests/
│   ├── core/
│   │   ├── guardrails/
│   │   │   ├── test_apply.py
│   │   │   ├── test_apply_integration.py
│   │   │   ├── test_normalize.py
│   │   │   ├── test_spend_tracker.py
│   │   │   └── test_types.py
│   │   ├── wallets/
│   │   │   ├── test_config.py
│   │   │   ├── test_evm_signer.py
│   │   │   └── test_scw_signer.py
│   │   ├── test_bazaar.py
│   │   ├── test_bazaar_integration.py
│   │   ├── test_client.py
│   │   └── test_facilitator.py
│   └── middleware/
│       ├── conftest.py         # Shared fakes (FakeFacilitatorSync/Async)
│       ├── flask/
│       │   ├── test_flask_payment_middleware.py
│       │   └── test_flask_payment_required.py
│       └── fastapi/
│           ├── test_fastapi_payment_middleware.py
│           └── test_fastapi_payment_required.py
├── e2e/
│   ├── cdp_wallet_e2e.py       # CDP wallet EOA + SCW e2e tests
│   ├── guardrails_e2e.py       # Spend controls + balance check e2e tests
│   ├── server.py               # Standalone Flask x402 server for e2e
│   ├── server_e2e.py           # Facilitator e2e test (raw private key)
│   └── .env.example            # Template for e2e credentials
├── docs/
│   ├── quickstart-buyers.md
│   ├── quickstart-sellers.md
│   ├── env-setup.md
│   ├── route-config.md
│   ├── client-guardrails.md
│   └── sdk-support.md
├── pyproject.toml
└── README.md
```

## Development Setup

### Prerequisites

- Python >= 3.10
- [uv](https://github.com/astral-sh/uv) (recommended)

### Installation

```bash
cd python/x402

# Install all dependencies (including dev) into the managed .venv
uv sync --extra dev

# Alternative: install in editable mode with pip
pip install -e ".[dev]"
```

## Development Workflow

### Common Commands

Run all commands from the `python/x402/` directory using `uv run` so they execute inside the managed virtual environment:

| Command                          | Description                   |
| -------------------------------- | ----------------------------- |
| `uv run ruff check .`            | Lint and report issues        |
| `uv run ruff check --fix .`      | Lint and auto-fix issues      |
| `uv run ruff format .`           | Format code                   |
| `uv run ruff format --check .`   | Check formatting (CI)         |
| `uv run mypy cdp_x402/ --strict` | Type-check the package        |
| `uv run pytest -q`               | Run all tests                 |
| `uv run pytest -v`               | Run tests with verbose output |

## Testing

Tests live in `tests/` and use [pytest](https://docs.pytest.org/).

All external dependencies (`cdp-sdk`, `x402`) are mocked via `sys.modules` injection
so tests run without real credentials, installed packages, or network access.
Run pytest through `uv` so it uses the managed Python environment and installed
extras. Do not run plain `pytest` from your shell.

```bash
# Run all tests
uv run pytest -q

# Run a specific test file
uv run pytest tests/core/test_facilitator.py

# Run with verbose output
uv run pytest -v
```

### Test Patterns

- Inject fake module trees into `sys.modules` to isolate CDP SDK and x402 imports.
- Use `monkeypatch.setenv` / `monkeypatch.delenv` for credential env vars — never
  mutate `os.environ` directly.
- Assert on the arguments passed to mocked constructors, not just that they were called.
- Keep each test focused on one behaviour; use descriptive class/method names.

## E2E Tests

The Python e2e scripts live in `e2e/` and test the full payment flow against
Base Sepolia using real CDP wallets. They are self-contained scripts using
[inline script dependencies](https://docs.astral.sh/uv/guides/scripts/#declaring-script-dependencies)
and do not require a separate install step.

```bash
cd python/x402
cp e2e/.env.example .env   # fill in your credentials
uv run ./e2e/cdp_wallet_e2e.py
uv run ./e2e/server_e2e.py
uv run ./e2e/guardrails_e2e.py
```

Required env vars:

| Variable             | Description        |
| -------------------- | ------------------ |
| `CDP_API_KEY_ID`     | CDP API key ID     |
| `CDP_API_KEY_SECRET` | CDP API key secret |
| `CDP_WALLET_SECRET`  | CDP wallet secret  |

Optional env vars for `cdp_wallet_e2e.py`:

| Variable                 | Default                | Description                        |
| ------------------------ | ---------------------- | ---------------------------------- |
| `CDP_ACCOUNT_NAME`       | `"x402-e2e-test"`      | Named CDP account for EOA payments |
| `CDP_OWNER_ACCOUNT_NAME` | `"x402-e2e-scw-owner"` | Owner EOA name for SCW flow        |
| `CDP_RUN_SCW_E2E`        | `"1"`                  | Set to `"0"` to disable SCW flow   |

Additional env vars for `server_e2e.py` and `guardrails_e2e.py`:

| Variable           | Description                                     |
| ------------------ | ----------------------------------------------- |
| `PAYER_PRIVATE_KEY`| Hex private key of the payer wallet             |
| `RECEIVER_ADDRESS` | EVM address that receives the payment           |

## Code Quality

### Linting

[Ruff](https://docs.astral.sh/ruff/) handles linting:

```bash
# Check for issues
ruff check .

# Auto-fix fixable issues
ruff check --fix .

# Check only (for CI)
ruff check --no-fix .
```

Rules enabled (configured in `pyproject.toml`):

| Code     | Ruleset                                                 |
| -------- | ------------------------------------------------------- |
| `E`, `F` | pycodestyle + pyflakes (core style and error detection) |
| `I`      | isort (import ordering)                                 |
| `UP`     | pyupgrade (modern Python idioms)                        |
| `B`      | flake8-bugbear (common bugs and design issues)          |

### Formatting

Ruff also handles formatting (replaces Black):

```bash
# Format files
ruff format .

# Check formatting without modifying files (for CI)
ruff format --check .
```

### Type Checking

[mypy](https://mypy.readthedocs.io/) runs in strict mode:

```bash
mypy cdp_x402/ --strict
```

mypy configuration lives in `pyproject.toml` under `[tool.mypy]`. Imports from
`cdp` and `x402` are suppressed (`ignore_missing_imports = true`) because those
packages don't ship inline stubs and are optional at type-check time.

Conventions:

- Annotate all public function signatures.
- Use `from __future__ import annotations` for deferred evaluation of forward references.
- Use `TYPE_CHECKING` guards for runtime-optional imports.
- Import `Callable` from `collections.abc`, not `typing`.
