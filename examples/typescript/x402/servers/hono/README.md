# x402 Hono Example

A Hono server protected with x402 payments using the CDP facilitator.

## Overview

This example demonstrates using `createCdpHonoMiddleware` from `@coinbase/x402-hono` to add x402 payment protection to a Hono application. The middleware automatically configures the CDP facilitator and registers default payment schemes (ExactEvm + UptoEvm on Base, ExactSvm on Solana).

## Prerequisites

- Node.js 18+
- pnpm
- A [CDP API key](https://portal.cdp.coinbase.com)
- An EVM wallet address to receive payments

## Setup

1. Copy the environment variables file and fill in your values:

```bash
cp .env.example .env
```

2. Install dependencies:

```bash
pnpm install

# Build the local packages consumed via file: dependencies.
pnpm --dir ../../../../typescript/packages/x402 install
pnpm --dir ../../../../typescript/packages/x402 build
pnpm --dir ../../../../typescript/packages/hono install
pnpm --dir ../../../../typescript/packages/hono build
```

3. Start the server:

```bash
PAY_TO=0x... pnpm start
```

The server will start at `http://localhost:8402`.

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
| `PAY_TO`                    | EVM address (0x...) to receive payments                                        |
