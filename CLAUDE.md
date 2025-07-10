# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This is the Coinbase Developer Platform (CDP) SDK repository containing multi-language client libraries for creating, managing, and using crypto wallets. The SDK supports TypeScript, Python, and Go implementations.

## Repository Structure

- `typescript/` - TypeScript/Node.js SDK implementation
- `python/` - Python SDK implementation
- `go/` - Go SDK implementation
- `examples/` - Working examples for all languages
- `openapi.yaml` - OpenAPI specification for the CDP API

## Development Commands

### TypeScript (`typescript/` directory)

```bash
# Install dependencies
pnpm install

# Build the SDK
pnpm build

# Run tests
pnpm test

# Run E2E tests
pnpm test:e2e

# Lint code
pnpm lint

# Fix linting issues
pnpm lint:fix

# Format code
pnpm format

# Check formatting
pnpm format:check

# Generate docs
pnpm docs

# Generate OpenAPI client
pnpm orval
```

### Python (`python/` directory)

```bash
# Install dependencies (with dev dependencies)
uv sync

# Run tests
make test

# Run only unit tests (exclude E2E)
make e2e

# Lint
make lint

# Fix linting issues
make lint-fix

# Format code
make format

# Check formatting
make format-check

# Generate docs
make docs

# Generate OpenAPI client
make python-client
```

### Go (`go/` directory)

```bash
# Clean and prepare
make clean

# Run tests
make test

# Lint code
make lint

# Fix linting issues
make lint-fix

# Generate OpenAPI client
make client

# Generate docs
make docs
```

### Root Level

```bash
# Update OpenAPI specification
make update-openapi

# Check if OpenAPI spec is up to date
make check-openapi
```

## Architecture

### Core Components

**TypeScript SDK:**

- `CdpClient` - Main client for API interactions
- `EvmServerAccount` - Server-managed EVM accounts
- `EvmSmartAccount` - Smart contract accounts for EVM
- Account management, transaction signing, and policy controls
- Account types for EVM and Solana blockchains
- Compatible with Viem for Ethereum interactions

**Python SDK:**

- `CdpClient` - Main client class
- `EvmServerAccount` - Server-managed EVM accounts
- `EvmSmartAccount` - Smart contract accounts
- Account types for EVM and Solana blockchains
- Compatible with Web3.py for Ethereum interactions

**Go SDK:**

- JWT-based authentication system
- OpenAPI generated client

### Key Features

- Multi-blockchain support (EVM chains, Solana)
- Server-managed and local account types
- Policy engine for operation controls
- Smart account (Account Abstraction) support

## Testing Strategy

- Unit tests for core functionality
- E2E tests requiring live API credentials
- Mock Service Worker (MSW) for HTTP mocking in TypeScript
- Pytest fixtures and mocking in Python

## Configuration Files

- `openapi.yaml` - API specification (auto-updated from CDN)
- Language-specific configs: `pyproject.toml`, `package.json`, `go.mod`
- Linting: ESLint (TS), Ruff (Python), golangci-lint (Go)
- CI/CD via language-specific workflows

## Examples

The `examples/` directory contains working code samples for:

- Account creation and management
- Transaction sending and signing
- Token transfers and swaps
- Policy management
- Smart account operations

Each language has its own examples directory with runnable scripts.
