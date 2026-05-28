# x402 Express Example

An Express server protected with x402 payments using the CDP facilitator.

## Overview

This example demonstrates using `createCdpResourceServer` from `@coinbase/x402` to add x402 payment protection to an Express application. `createCdpResourceServer` provisions a receiver wallet automatically from your CDP credentials, configures the CDP facilitator, and registers default payment schemes (ExactEvm + UptoEvm on Base, ExactSvm on Solana). The returned server is passed directly to `paymentMiddlewareFromHTTPServer` from `@x402/express`.

## Prerequisites

- Node.js 18+
- pnpm
- A [CDP API key](https://portal.cdp.coinbase.com) with a funded wallet secret

## Setup

1. Install dependencies:

```bash
pnpm install
```

2. Start the server:

```bash
pnpm start
```

The `prestart` hook builds the local packages automatically. The server will start at `http://localhost:8402`.

## Usage

```bash
# Without payment — returns 402
curl http://localhost:8402/report

# With x402 payment header (use an x402-compatible client)
```

## Environment Variables

| Variable                    | Description                                                                    |
| --------------------------- | ------------------------------------------------------------------------------ |
| `CDP_SERVER_API_KEY_ID`     | CDP API key ID from [portal.cdp.coinbase.com](https://portal.cdp.coinbase.com) |
| `CDP_SERVER_API_KEY_SECRET` | CDP API key secret                                                             |
| `CDP_SERVER_WALLET_SECRET`  | CDP wallet secret used to provision the receiver wallet                        |
