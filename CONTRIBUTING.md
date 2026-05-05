# Contributing Guide

## Table of Contents

- [Overview](#overview)
- [Repository Structure](#repository-structure)
- [Language-Specific Guides](#language-specific-guides)
  - [Go Development](#go-development)
  - [Python Development](#python-development)
  - [Rust Development](#rust-development)
  - [Swift Development](#swift-development)
  - [TypeScript Development](#typescript-development)
- [Releasing](#releasing)
  - [TypeScript](#releasing-typescript)
  - [Python](#releasing-python)
  - [Rust](#releasing-rust)
  - [Swift](#releasing-swift)
  - [Go](#releasing-go)

## Overview

This repository contains the CDP SDK implementations in multiple programming languages. Each language implementation is contained in its own directory and has its own build tools, dependencies, and development workflow.

## Repository Structure

```
cdp-sdk/
├── go/         # Go implementation
├── python/     # Python implementation
├── rust/       # Rust implementation
├── swift/      # Swift implementation
└── typescript/ # TypeScript implementation
```

## Language-Specific Guides

### Go Development

#### Prerequisites

- Go 1.23 or higher
- Make

#### Setup

```bash
cd go
make build_deps
```

#### Development Commands

```bash
# Format code
make lint-fix

# Run linter
make lint

# Run tests
make test
```

### Python Development

#### Prerequisites

- [Development Setup](./python/CONTRIBUTING.md#development-setup)
- Python 3.10 or higher
- pip

#### Setup

```bash
cd python
make setup
make install
```

#### Development Commands

```bash
# Format code
make format

# Run linter
make lint

# Fix lint errors
make lint-fix

# Run tests
make test

# Generate documentation
make docs

# Generate HTML of documentation
make local-docs
```

### Rust Development

#### Prerequisites

- Rust 1.93.1 or higher
- Cargo
- Make

#### Setup

```bash
cd rust
cargo build
```

#### Development Commands

```bash
# Check code and dependencies
make check

# Format code
make format

# Run linter
make lint

# Fix lint errors
make lint-fix

# Run tests
make test

# Run end-to-end tests
make test-e2e

# Build documentation
make docs

# Build client
make build

# Generate OpenAPI client and build client
make generate
```

### Swift Development

#### Prerequisites

- [Development Setup](./swift/CONTRIBUTING.md#development-setup)
- Swift 5.9+ (Xcode 15+)
- `swift-format` for linting

#### Setup

```bash
cd swift
swift build
```

#### Development Commands

```bash
# Build
make build

# Run tests
make test

# Run E2E tests
make test-e2e

# Format code
make format

# Check formatting (CI)
make format-check

# Run linter
make lint

# Fix lint issues
make lint-fix

# Generate OpenAPI client
make generate

# Generate docs
make docs
```

### TypeScript Development

#### Prerequisites

- [Development Setup](./typescript/CONTRIBUTING.md#development-setup)
- Node.js v22.x or higher
- pnpm 10.x or higher

#### Setup

```bash
cd typescript
pnpm install
```

#### Development Commands

```bash
# Format code
pnpm format

# Run linter
pnpm lint

# Fix lint errors
pnpm lint:fix

# Run tests
pnpm test

# Build documentation
pnpm docs

# Generate OpenAPI client
pnpm orval
```

Each language implementation follows its own idiomatic conventions and best practices. Please refer to the specific language directories for more detailed documentation and requirements.

## Releasing

All SDKs are released via GitHub Actions workflows triggered manually (`workflow_dispatch`). Each language has its own publish workflow.

### Releasing TypeScript

The TypeScript SDK is published to npm as `@coinbase/cdp-sdk`.

1. Ensure all changes are merged to `main` and tests pass.
2. Update the version in `typescript/package.json`.
3. Run `pnpm run changeset` in `typescript/` to generate a changelog entry (if not already done via PR).
4. Trigger the [Publish @coinbase/cdp-sdk](https://github.com/coinbase/cdp-sdk/actions/workflows/typescript_publish.yml) workflow from the Actions tab.

The workflow builds, runs `prepublish`, and publishes to npm using trusted publishing (OIDC).

### Releasing Python

The Python SDK is published to PyPI as `cdp-sdk`.

1. Ensure all changes are merged to `main` and tests pass.
2. Update the version in `python/pyproject.toml`.
3. Add a changelog entry in `python/changelog.d/` (see [Python CONTRIBUTING](./python/CONTRIBUTING.md#changelog)).
4. Trigger the [Publish cdp-sdk](https://github.com/coinbase/cdp-sdk/actions/workflows/python_publish.yml) workflow from the Actions tab.

The workflow builds with `uv build` and publishes to PyPI using trusted publishing (OIDC).

### Releasing Rust

The Rust SDK is published to crates.io as `cdp-sdk`.

1. Ensure all changes are merged to `main` and tests pass.
2. Update the version in `rust/Cargo.toml`.
3. Trigger the [Publish cdp-sdk (Rust)](https://github.com/coinbase/cdp-sdk/actions/workflows/rust_publish.yml) workflow from the Actions tab.

The workflow builds in release mode and publishes using a `CARGO_REGISTRY_TOKEN` secret.

### Releasing Swift

The Swift SDK is distributed via Swift Package Manager (SPM). SPM resolves packages from git tags — there is no registry upload.

1. Ensure all changes are merged to `main` and tests pass.
2. Trigger the [Publish cdp-sdk (Swift)](https://github.com/coinbase/cdp-sdk/actions/workflows/swift_publish.yml) workflow from the Actions tab.
3. Enter the version number (semver format, e.g., `0.1.0`) when prompted.

The workflow:
- Validates the version format
- Builds in release mode
- Runs all tests
- Creates and pushes the git tag `cdp-sdk-swift@v<version>`

Consumers add the dependency via SPM pointing at this repository and the tagged version.

### Releasing Go

The Go SDK uses Go modules. Releases are tagged directly in the repository.

1. Ensure all changes are merged to `main` and tests pass.
2. Create and push a git tag following Go module conventions (e.g., `go/v0.1.0`).

Go module consumers will automatically pick up the new version via `go get`.
