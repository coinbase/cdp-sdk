# CDP x402 Fetch Client Example

Demonstrates making x402-protected requests using a **CDP Server Wallet (EOA)** via `CdpX402Client`.

`CdpX402Client` initializes lazily on the first payment — no async setup at startup. Switch between CDP EOA and smart wallet backends via `CDP_WALLET_TYPE` without changing code.

## Prerequisites

- Node.js 20+
- A CDP API key from [portal.cdp.coinbase.com](https://portal.cdp.coinbase.com/)
- A funded wallet on your target network (e.g. USDC on Base Sepolia for testing)
- A running x402-protected server (see `examples/typescript/servers/express/`)

## Setup

```bash
cp .env.example .env
pnpm install

# Build the local @coinbase/x402 package used by this example.
pnpm --dir ../../../../typescript/packages/x402 install
pnpm --dir ../../../../typescript/packages/x402 build
```

Edit `.env`:

```env
CDP_API_KEY_ID=your-api-key-id
CDP_API_KEY_SECRET=your-api-key-secret
CDP_WALLET_SECRET=your-wallet-secret

# Wallet type — controls which backend signs payments
# "cdp-eoa"     (default) CDP Server Wallet
# "cdp-smart"   CDP Smart Contract Wallet (requires CDP_OWNER_ACCOUNT_NAME)
CDP_WALLET_TYPE=cdp-eoa

# Optional: named CDP account (defaults to "x402-server-wallet-1")
# CDP_ACCOUNT_NAME=my-wallet

# Required only for cdp-smart:
# CDP_OWNER_ACCOUNT_NAME=my-owner-wallet

RESOURCE_SERVER_URL=http://localhost:8402
ENDPOINT_PATH=/report
```

## Run

```bash
pnpm start
```

## Environment Variables

| Variable                 | Required                | Default                 | Description             |
| ------------------------ | ----------------------- | ----------------------- | ----------------------- |
| `CDP_API_KEY_ID`         | Yes (cdp-eoa/cdp-smart) | —                       | CDP API key ID          |
| `CDP_API_KEY_SECRET`     | Yes (cdp-eoa/cdp-smart) | —                       | CDP API key secret      |
| `CDP_WALLET_SECRET`      | Yes (cdp-eoa/cdp-smart) | —                       | CDP wallet secret       |
| `CDP_WALLET_TYPE`        | No                      | `cdp-eoa`               | Wallet backend          |
| `CDP_ACCOUNT_NAME`       | No                      | `x402-server-wallet-1`  | Named CDP account       |
| `CDP_OWNER_ACCOUNT_NAME` | cdp-smart only          | —                       | Owner EOA for SCW       |
| `RESOURCE_SERVER_URL`    | No                      | `http://localhost:8402` | Target server URL       |
| `ENDPOINT_PATH`          | No                      | `/report`               | Protected endpoint path |
