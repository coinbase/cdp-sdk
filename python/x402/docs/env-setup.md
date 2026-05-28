# Environment setup

All required credentials are passed as environment variables. Explicit values
in code always take precedence over environment variables.

## Buyer (client) credentials

Used by `CdpX402Client` / `createCdpX402Client` (TypeScript and Python) and any code that calls into the CDP wallet or signing APIs.

| Variable                 | Required       | Default                | Description                                                                          |
| ------------------------ | -------------- | ---------------------- | ------------------------------------------------------------------------------------ |
| `CDP_API_KEY_ID`         | Yes            | —                      | CDP API key ID                                                                       |
| `CDP_API_KEY_SECRET`     | Yes            | —                      | CDP API key secret                                                                   |
| `CDP_WALLET_SECRET`      | Yes            | —                      | Wallet secret (seed encryption key)                                                  |
| `CDP_WALLET_TYPE`        | No             | `cdp-eoa`              | Wallet backend: `cdp-eoa` (Server Wallet EOA) or `cdp-smart` (Smart Contract Wallet) |
| `CDP_ACCOUNT_NAME`       | No             | `x402-server-wallet-1` | Named CDP account to use for the paying wallet                                       |
| `CDP_OWNER_ACCOUNT_NAME` | cdp-smart only | —                      | Owner EOA account name when `CDP_WALLET_TYPE=cdp-smart`                              |

### Obtaining credentials

1. Sign in at [portal.cdp.coinbase.com](https://portal.cdp.coinbase.com/)
2. Navigate to **Dashboard** -> **API Keys** and create a new key — copy the key ID and secret.
3. Navigate to **Wallets** -> **Server Wallets** -> **Accounts**, create a new wallet secret, and copy —
   it is shown only once at creation time; store it securely.

## Seller (facilitator) credentials

Used by `createCdpFacilitatorClient` / `create_cdp_facilitator_client` /
`CreateCdpFacilitatorClient`, `createCdpResourceServer`,
`createCdpExpressMiddleware`, `createCdpHonoMiddleware`, and
`createCdpPaymentProxy`. Only the API key pair is required — no wallet secret
is needed for facilitator-only usage.

| Variable                    | Required                                                      | Default | Description                                    |
| --------------------------- | ------------------------------------------------------------- | ------- | ---------------------------------------------- |
| `CDP_SERVER_API_KEY_ID`     | Yes                                                           | —       | CDP API key ID for the seller                  |
| `CDP_SERVER_API_KEY_SECRET` | Yes                                                           | —       | CDP API key secret for the seller              |
| `CDP_SERVER_WALLET_SECRET`  | `createCdpResourceServer` / `create_cdp_resource_server` only | —       | Wallet secret for receiver wallet provisioning |

> **Note:** `createCdpResourceServer` (TypeScript) and
> `create_cdp_resource_server` (Python) provision a receiver wallet on your
> behalf, so they require `CDP_SERVER_WALLET_SECRET` in addition to the API
> key pair. The wallet defaults to a CDP Server Wallet (EOA).

> The SDKs will fall back to `CDP_API_KEY_ID` / `CDP_API_KEY_SECRET` /
> `CDP_WALLET_SECRET` if the `CDP_SERVER_*` equivalents are not set, but this
> is an implementation detail — prefer the server-prefixed names.

### Server-side wallet configuration (TypeScript and Python)

When using `createCdpResourceServer` (TypeScript) or `create_cdp_resource_server` (Python), the receiver wallet can be configured independently from the payer wallet using `CDP_SERVER_*` wallet variables.
This prevents naming collisions when running payer and server in the same
process.

| Variable                        | Required       | Default                  | Description                                       |
| ------------------------------- | -------------- | ------------------------ | ------------------------------------------------- |
| `CDP_SERVER_WALLET_TYPE`        | No             | `cdp-eoa`                | Wallet backend: `cdp-eoa` or `cdp-smart`          |
| `CDP_SERVER_ACCOUNT_NAME`       | No             | `x402-receiver-wallet-1` | Named CDP account for the receiver wallet         |
| `CDP_SERVER_OWNER_ACCOUNT_NAME` | cdp-smart only | —                        | Owner EOA account name for Smart Contract Wallets |

## Wallet isolation

If multiple services share the same CDP project and use the default
`createCdpResourceServer` / `create_cdp_resource_server` configuration, they
will share a single receiver wallet (`x402-receiver-wallet-1`). To isolate
wallets per service, set `walletConfig.accountName` (TypeScript) or
`CDP_SERVER_ACCOUNT_NAME` (Python) explicitly, or use separate CDP projects.

## Example `.env` file (buyer)

```bash
# Required for all buyer flows
CDP_API_KEY_ID=your-cdp-api-key-id
CDP_API_KEY_SECRET=your-cdp-api-key-secret
CDP_WALLET_SECRET=your-wallet-secret

# Optional wallet configuration
CDP_WALLET_TYPE=cdp-eoa  # Options: cdp-eoa | cdp-smart
# CDP_ACCOUNT_NAME=my-wallet
# CDP_OWNER_ACCOUNT_NAME=my-owner-wallet   # required for cdp-smart
```

## Example `.env` file (seller with auto-provisioned receiver)

```bash
# Seller credentials
CDP_SERVER_API_KEY_ID=your-cdp-api-key-id
CDP_SERVER_API_KEY_SECRET=your-cdp-api-key-secret
CDP_SERVER_WALLET_SECRET=your-wallet-secret
```

When running buyer and seller in the same process, use separate credential sets
to avoid collisions:

```bash
# Buyer credentials
CDP_API_KEY_ID=your-cdp-api-key-id
CDP_API_KEY_SECRET=your-cdp-api-key-secret
CDP_WALLET_SECRET=your-wallet-secret

# Seller credentials
CDP_SERVER_API_KEY_ID=your-cdp-server-api-key-id
CDP_SERVER_API_KEY_SECRET=your-cdp-server-api-key-secret
CDP_SERVER_WALLET_SECRET=your-server-wallet-secret
```

## Example `.env` file (seller, facilitator-only)

```bash
# Seller credentials
CDP_SERVER_API_KEY_ID=your-cdp-api-key-id
CDP_SERVER_API_KEY_SECRET=your-cdp-api-key-secret

# PAY_TO is specified directly in the route config when not using
# createCdpResourceServer (see route-config.md)
PAY_TO=0xYourReceiverAddress
```
