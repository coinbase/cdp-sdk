# x402 Next.js Example

A Next.js application protected with x402 payments using the CDP facilitator.

## Overview

This example demonstrates two patterns for adding x402 payment protection to a Next.js app:

1. **`middleware.ts`** — Uses `createCdpPaymentProxy` to protect routes via Next.js middleware
2. **`app/api/report/route.ts`** — Uses `createCdpRouteHandler` from `@coinbase/x402-next/server` to protect individual API routes (payment settles after a successful response)

## Prerequisites

- Node.js 20.9+ (required by `next@^16`)
- pnpm
- A [CDP API key](https://portal.cdp.coinbase.com)
- An EVM wallet address to receive payments

## Setup

1. Copy the environment variables file and fill in your values:

```bash
cp .env.example .env.local
```

2. Install dependencies:

```bash
pnpm install

# Build the local packages consumed via file: dependencies.
pnpm --dir ../../../../typescript/packages/x402 install
pnpm --dir ../../../../typescript/packages/x402 build
pnpm --dir ../../../../typescript/packages/next install
pnpm --dir ../../../../typescript/packages/next build
```

3. Start the development server:

```bash
pnpm dev
```

The server will start at `http://localhost:3000`.

## Usage

### Protected API Route

```bash
# Without payment — returns 402
curl http://localhost:3000/api/report

# With x402 payment header (use an x402-compatible client)
```

### Protected Page Route

The page at `app/report/page.tsx` is gated by `middleware.ts`. Visit
`http://localhost:3000/report` in a browser with an x402-compatible wallet
extension installed.

## Environment Variables

| Variable                    | Description                                                                    |
| --------------------------- | ------------------------------------------------------------------------------ |
| `CDP_SERVER_API_KEY_ID`     | CDP API key ID from [portal.cdp.coinbase.com](https://portal.cdp.coinbase.com) |
| `CDP_SERVER_API_KEY_SECRET` | CDP API key secret                                                             |
| `PAY_TO`                    | EVM address (0x...) to receive payments                                        |
