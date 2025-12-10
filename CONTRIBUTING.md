# Contributing Guide

## Table of Contents

- [Overview](#overview)
- [Repository Structure](#repository-structure)
- [Language-Specific Guides](#language-specific-guides)
  - [Go Development](#go-development)
  - [Python Development](#python-development)
  - [Rust Development](#rust-development)
  - [TypeScript Development](#typescript-development)

## Overview

This repository contains the CDP SDK implementations in multiple programming languages. Each language implementation is contained in its own directory and has its own build tools, dependencies, and development workflow.

## Repository Structure

```
cdp-sdk/
├── go/         # Go implementation
├── python/     # Python implementation
├── rust/  # Rust implementation
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

- Rust 1.70 or higher
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
