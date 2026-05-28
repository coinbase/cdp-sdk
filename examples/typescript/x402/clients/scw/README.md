# CDP x402 Smart Contract Wallet Client Example

Demonstrates making x402-protected requests using a **CDP Smart Contract Wallet (ERC-4337)**.

SCWs are useful when you need:

- Gas sponsorship on Base/Base Sepolia
- Spending permissions (delegate spend limits to agents)
- Account abstraction features

The SCW **address** is the payer. The owner EOA signs EIP-712 typed data on its behalf. The `CDP_OWNER_ACCOUNT_NAME` must refer to a funded CDP EOA account.

## Prerequisites

- Node.js 20+
- A CDP API key from [portal.cdp.coinbase.com](https://portal.cdp.coinbase.com/)
- A CDP EOA account funded with USDC on Base Sepolia (this is the SCW owner)
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

# Name of the CDP EOA that will own the smart wallet
CDP_OWNER_ACCOUNT_NAME=x402-scw-owner

# Name of the smart account (created if it doesn't exist)
# CDP_ACCOUNT_NAME=x402-server-wallet-1

# Set to "true" to auto-transfer 0.005 USDC from owner → SCW before payment
# (requires owner to be funded with USDC on Base Sepolia)
# FUND_SCW=true

RESOURCE_SERVER_URL=http://localhost:8402
ENDPOINT_PATH=/report
```

## Run

```bash
pnpm start
```

## Funding the Smart Wallet

Smart wallets start with zero balance. Before making a payment, fund the SCW with USDC:

1. **Auto-fund**: set `FUND_SCW=true` — the example transfers 0.005 USDC from the owner EOA.
2. **Manual**: send USDC to the SCW address printed at startup using any wallet.

The owner EOA must hold USDC on Base Sepolia to use the auto-fund option.

## Environment Variables

| Variable                 | Required | Default                 | Description                   |
| ------------------------ | -------- | ----------------------- | ----------------------------- |
| `CDP_API_KEY_ID`         | Yes      | —                       | CDP API key ID                |
| `CDP_API_KEY_SECRET`     | Yes      | —                       | CDP API key secret            |
| `CDP_WALLET_SECRET`      | Yes      | —                       | CDP wallet secret             |
| `CDP_OWNER_ACCOUNT_NAME` | Yes      | `x402-scw-owner`        | Owner EOA account name        |
| `CDP_ACCOUNT_NAME`       | No       | `x402-server-wallet-1`  | Smart account name            |
| `FUND_SCW`               | No       | `false`                 | Auto-transfer USDC from owner |
| `RESOURCE_SERVER_URL`    | No       | `http://localhost:8402` | Target server URL             |
| `ENDPOINT_PATH`          | No       | `/report`               | Protected endpoint path       |
