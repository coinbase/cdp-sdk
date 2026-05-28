# SDK support matrix

Feature comparison across the TypeScript, Python, and Go SDKs.

## Buyer features

| Feature                                             | TypeScript                 | Python                        | Go  |
| --------------------------------------------------- | -------------------------- | ----------------------------- | --- |
| Auto-configured CDP client (env vars)               | ✅ `CdpX402Client`         | ✅ `CdpX402Client`            | —   |
| Eager client creation (pre-provision wallet)        | ✅ `createCdpX402Client`   | ✅ `create_cdp_x402_client`   | —   |
| Payment-enabled fetch wrapper                       | ✅ `wrapFetchWithPayment`  | ✅ `x402AsyncTransport`       | —   |
| EVM payments (Base, Polygon, etc.)                  | ✅                         | ✅                            | —   |
| Solana payments                                     | ✅                         | —                             | —   |
| CDP Server Wallet (EOA) signing                     | ✅                         | ✅ `from_cdp_evm_account`     | —   |
| Smart Contract Wallet (SCW) signing                 | ✅                         | ✅ `from_cdp_smart_wallet`    | —   |
| Spend controls (per-payment cap)                    | ✅ `applySpendControls`    | ✅ `apply_spend_controls`     | —   |
| Spend controls (cumulative cap + window)            | ✅                         | ✅                            | —   |
| Spend controls (network / asset / payee allow-list) | ✅                         | ✅                            | —   |
| Custom spend store (Redis, etc.)                    | ✅ `SpendStore`            | ✅ `SpendStore`               | —   |
| Bazaar discovery client                             | ✅ `createCdpBazaarClient` | ✅ `create_cdp_bazaar_client` | —   |

## Seller features

| Feature                                  | TypeScript                                       | Python                                              | Go                              |
| ---------------------------------------- | ------------------------------------------------ | --------------------------------------------------- | ------------------------------- |
| CDP facilitator client                   | ✅ `createCdpFacilitatorClient`                  | ✅ `create_cdp_facilitator_client`                  | ✅ `CreateCdpFacilitatorClient` |
| Async facilitator client                 | ✅                                               | ✅                                                  | ✅                              |
| Sync facilitator client                  | —                                                | ✅ `create_cdp_facilitator_client_sync`             | —                               |
| Auto-provisioned receiver wallet         | ✅ `createCdpResourceServer`                     | ✅ `create_cdp_resource_server`                     | —                               |
| Simplified route config (`price` only)   | ✅ `CdpRouteConfig`                              | ✅ `CdpRouteConfig`                                 | —                               |
| Full x402 route config (`accepts` array) | ✅                                               | ✅                                                  | ✅                              |
| JSON config file loading                 | ✅ `configPath`                                  | ✅ `config_path`                                    | —                               |
| EVM payment acceptance                   | ✅                                               | ✅                                                  | ✅                              |
| Solana payment acceptance                | ✅                                               | ✅                                                  | —                               |
| Standard library HTTP server             | —                                                | —                                                   | ✅                              |
| Bazaar auto-registration                 | ✅ (auto-injected via `createCdpResourceServer`) | ✅ (auto-injected via `create_cdp_resource_server`) | —                               |
| EIP-2612 gas sponsoring                  | ✅ (auto-injected)                               | ✅ (auto-injected)                                  | —                               |
| ERC-20 approval gas sponsoring           | ✅ (auto-injected)                               | ✅ (auto-injected)                                  | —                               |

## Package names

| SDK                              | Package                                   |
| -------------------------------- | ----------------------------------------- |
| TypeScript (buyer + seller core) | `@coinbase/x402`                          |
| TypeScript Express integration   | `@coinbase/x402-express`                  |
| TypeScript Hono integration      | `@coinbase/x402-hono`                     |
| TypeScript Next.js integration   | `@coinbase/x402-next`                     |
| Python                           | `cdp-x402`                                |
| Go                               | `github.com/coinbase/cdp-x402/go/cdpx402` |

## TypeScript subpath exports

`@coinbase/x402` exposes several subpath exports for tree-shaking or
framework-specific imports:

| Import path                  | Contents                                                                         |
| ---------------------------- | -------------------------------------------------------------------------------- |
| `@coinbase/x402`             | All buyer + seller exports                                                       |
| `@coinbase/x402/client`      | `CdpX402Client`, `createCdpX402Client`                                           |
| `@coinbase/x402/server`      | `createCdpResourceServer`, `CdpResourceServer`, `getCdpDefaultSchemes`           |
| `@coinbase/x402/facilitator` | `createCdpFacilitatorClient`                                                     |
| `@coinbase/x402/wallets`     | CDP wallet/signer helpers                                                        |
| `@coinbase/x402/guardrails`  | `applySpendControls`, `SpendControls`, `SpendControlError`, and supporting types |

## Environment variables

### Buyer credentials

| Variable                 | Buyer (TS)  | Buyer (Python) |
| ------------------------ | ----------- | -------------- |
| `CDP_API_KEY_ID`         | ✅ Required | ✅ Required    |
| `CDP_API_KEY_SECRET`     | ✅ Required | ✅ Required    |
| `CDP_WALLET_SECRET`      | ✅ Required | ✅ Required    |
| `CDP_WALLET_TYPE`        | Optional    | Optional       |
| `CDP_ACCOUNT_NAME`       | Optional    | Optional       |
| `CDP_OWNER_ACCOUNT_NAME` | SCW only    | SCW only       |

### Seller credentials

| Variable                        | Seller (TS)                    | Seller (Python)                   | Seller (Go) |
| ------------------------------- | ------------------------------ | --------------------------------- | ----------- |
| `CDP_SERVER_API_KEY_ID`         | ✅ Required                    | ✅ Required                       | ✅ Required |
| `CDP_SERVER_API_KEY_SECRET`     | ✅ Required                    | ✅ Required                       | ✅ Required |
| `CDP_SERVER_WALLET_SECRET`      | `createCdpResourceServer` only | `create_cdp_resource_server` only | —           |
| `CDP_SERVER_WALLET_TYPE`        | Optional                       | Optional                          | —           |
| `CDP_SERVER_ACCOUNT_NAME`       | Optional                       | Optional                          | —           |
| `CDP_SERVER_OWNER_ACCOUNT_NAME` | SCW only                       | SCW only                          | —           |

See [Environment setup](./env-setup.md) for full details.

## Supported networks

The CDP SDK defaults to mainnet networks. Testnets require explicit
configuration (pass them in `networks` for simplified CDP format, or in the
`network` field of each `accepts` entry for full x402 format).

| Network       | CAIP-2 ID                                 | Support              |
| ------------- | ----------------------------------------- | -------------------- |
| Base          | `eip155:8453`                             | All SDKs             |
| Base Sepolia  | `eip155:84532`                            | All SDKs             |
| Polygon       | `eip155:137`                              | TS + Python (EVM)    |
| Solana        | `solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp` | TS + Python (seller) |
| Solana Devnet | `solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1` | TypeScript           |

## Planned / future

- Go buyer client (EOA wallet, payment-enabled HTTP client)
- Go spend controls
- Python Solana buyer support
- Additional framework integrations
