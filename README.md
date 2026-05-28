<div align="center">
  <h1 style="font-size: 3em; margin-bottom: 20px;">
    CDP SDK
  </h1>

  <p style="font-size: 1.2em; max-width: 600px; margin: 0 auto 20px;">
    Client libraries for managing EVM and Solana wallets while relying on CDP to secure private keys.
  </p>

[![Follow @CoinbaseDev](https://img.shields.io/twitter/follow/CoinbaseDev.svg?style=social)](https://x.com/CoinbaseDev)
[![Chat on Discord](https://img.shields.io/badge/Chat%20on-Discord-5865F2?style=flat-square&logo=discord&logoColor=white)](https://discord.gg/invite/cdp)
[![MIT License](https://img.shields.io/badge/license-MIT-0052FF?style=flat-square)](https://github.com/coinbase/cdp-sdk/blob/main/LICENSE.md)

</div>

<br />

## Table of Contents

- [📖 Overview](#-overview)
- [🚀 Quickstart](#-quickstart)
- [📚 Documentation](#-documentation)
- [💡 Examples](#-examples)
- [🤝 Contributing](#-contributing)
- [🚨 Security and Bug Reports](#-security-and-bug-reports)
- [📧 Contact](#-contact)
- [✍️ Contributors](#-contributors)
- [📝 License](#-license)

## 📖 Overview

This repo contains the [Coinbase Developer Platform (CDP)](https://docs.cdp.coinbase.com/) SDK, which enables developers to programmatically create, manage, and use crypto wallets while relying on CDP to secure private keys.

## 🚀 Quickstart

CDP SDK has full-featured client libraries for the following languages. Follow the language-specific installation instructions.

- [TypeScript](./typescript)
- [Python](./python)
- [Go](./go)
- [Rust](./rust)

### x402 Payment Protocol

The repo also includes CDP-opinionated wrappers for the [x402 payment protocol](https://github.com/coinbase/x402), enabling paid HTTP requests using CDP wallets and the CDP hosted facilitator:

| Package | Language | Description |
| ------- | -------- | ----------- |
| [`@coinbase/x402`](./typescript/packages/x402) | TypeScript | Core CDP x402 client, wallet adapters, facilitator, resource server |
| [`@coinbase/x402-express`](./typescript/packages/x402-express) | TypeScript | CDP-opinionated Express middleware |
| [`@coinbase/x402-hono`](./typescript/packages/x402-hono) | TypeScript | CDP-opinionated Hono middleware |
| [`@coinbase/x402-next`](./typescript/packages/x402-next) | TypeScript | CDP-opinionated Next.js middleware and route handler |
| [`cdp-x402`](./python/x402) | Python | CDP x402 client, middleware for FastAPI and Flask |
| [`github.com/coinbase/cdp-sdk/go/x402`](./go/x402) | Go | CDP-authenticated facilitator client |

## 📚 Documentation

CDP SDK has auto-generated SDK docs for each of the full-featured client libraries:

- [TypeScript](https://coinbase.github.io/cdp-sdk/typescript)
- [Python](https://coinbase.github.io/cdp-sdk/python)
- [Go](https://coinbase.github.io/cdp-sdk/go)

Further documentation is also available on the CDP docs website:

- [Wallet API v2](https://docs.cdp.coinbase.com/wallet-api-v2/docs/welcome)
- [API Reference](https://docs.cdp.coinbase.com/api-v2/docs/welcome)

## 💡 Examples

CDP SDK contains fully runnable examples, see the [examples/README.md](./examples/README.md) for more info.

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details on:

- Repository structure
- Development setup for each language
- Testing and code style requirements
- Pull request process

## 🚨 Security and Bug Reports

If you discover a security vulnerability within this SDK, please see our [Security Policy](SECURITY.md) for disclosure information.

## 📧 Contact

For feature requests, feedback, or questions, please reach out to us in the
**#cdp-sdk** channel of the [Coinbase Developer Platform Discord](https://discord.com/invite/cdp).

Resources:

- [CDP API Reference](https://docs.cdp.coinbase.com/api-v2/docs/welcome)
- [GitHub Issues](https://github.com/coinbase/cdp-sdk/issues)

## ✍ Contributors

<a href="https://github.com/coinbase/cdp-sdk/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=coinbase/cdp-sdk" />
</a>

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE.md) file for details.
