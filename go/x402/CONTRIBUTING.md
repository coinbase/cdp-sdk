# Go x402 Contributing Guide

Guide for developing and contributing to the `go/x402` CDP x402 package.

## Contents

- [Repository Structure](#repository-structure)
- [Development Setup](#development-setup)
- [Development Workflow](#development-workflow)
- [Testing](#testing)
- [Code Quality](#code-quality)

## Repository Structure

```
go/x402/
├── constants.go        # CDP facilitator URL, paths, default networks/extensions
├── facilitator.go      # CdpFacilitatorClient, CreateCdpFacilitatorClient
├── facilitator_test.go # Unit tests (mocked HTTP transport and JWT generation)
├── bazaar.go           # Bazaar discovery client
├── bazaar_test.go
├── CONTRIBUTING.md
└── e2e/                # End-to-end tests (separate Go module)
    ├── go.mod
    ├── server_e2e.go
    └── .env.example
```

### Module

The x402 package lives inside the main CDP SDK Go module at
`github.com/coinbase/cdp-sdk/go`. Import it as:

```go
import x402 "github.com/coinbase/cdp-sdk/go/x402"
```

## Development Setup

### Prerequisites

- Go >= 1.24
- [golangci-lint](https://golangci-lint.run/) for linting
- [goimports](https://pkg.go.dev/golang.org/x/tools/cmd/goimports) for formatting

### Installation

```bash
# From the repo root — installs golangci-lint and goimports
make x402-deps-dev-go

# Or from go/
make deps-dev
```

## Development Workflow

### Common Commands

Run from the **repo root** using `make` targets:

| Command | Description |
| ------- | ----------- |
| `make x402-fmt-go` | Format Go files with goimports |
| `make x402-lint-go` | Run golangci-lint on x402 packages |
| `make x402-test-go` | Run x402 tests with race detector and coverage |
| `make x402-verify-go` | fmt + lint + test (pre-PR check) |

Or run raw Go commands from `go/`:

| Command | Description |
| ------- | ----------- |
| `go build ./x402/...` | Build x402 packages |
| `go test -race -cover ./x402/...` | Run tests with race detector and coverage |
| `go test -v -race ./x402/...` | Run tests with verbose output |
| `go vet ./x402/...` | Static analysis |
| `goimports -w .` | Format all Go files in-place |
| `golangci-lint run ./x402/...` | Full lint suite (CI) |

## Testing

Tests live alongside source files (e.g. `facilitator_test.go`) and use the
standard `testing` package plus `net/http/httptest` for HTTP server mocking.

```bash
# Run all x402 tests (with race detector and coverage)
cd go && go test -race -cover ./x402/...

# Run tests with verbose output
cd go && go test -v -race ./x402/...

# Run a specific test
cd go && go test -v ./x402/... -run TestCreateCdpFacilitatorClient
```

### Test Patterns

- Use `httptest.NewServer` for HTTP mocking — no external network calls in unit tests.
- Use `t.Setenv` (not `os.Setenv`) for environment variables — it restores the original value after the test automatically.
- Check all error return values.
- Use `t.Helper()` in test helper functions to get accurate failure line numbers.

## Code Quality

### Formatting

Go code must be formatted with `goimports` (a superset of `gofmt` that also
organises imports):

```bash
# Install goimports
go install golang.org/x/tools/cmd/goimports@latest

# Format all files in-place (from go/)
goimports -w .

# List files that need formatting (for CI — fails if output is non-empty)
gofmt -l ./x402/...
```

### Linting

```bash
# From go/
golangci-lint run ./x402/...
```

### Code Conventions

- Export types and functions that external packages need; keep internals unexported.
- Use interfaces to make components injectable and testable.
- Document all exported symbols with Go doc comments.
- Return `error` rather than panicking; wrap errors with `fmt.Errorf("...: %w", err)`.
