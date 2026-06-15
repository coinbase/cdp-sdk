# x402 Examples

Working examples for the x402 payment protocol integration in `@coinbase/cdp-sdk`.

## Client examples (payers)

Run from the `examples/typescript/` directory using the shared package:

```bash
# CDP Server Wallet (EOA) — lazy init, reads all config from env
pnpm tsx x402/clients/fetch/index.ts

# CDP Smart Contract Wallet
pnpm tsx x402/clients/scw/index.ts

# SCW with per-payment + cumulative spend caps
pnpm tsx x402/clients/scw/spend-controls.ts
```

Required env vars (add to `examples/typescript/.env`):

```
CDP_API_KEY_ID=...
CDP_API_KEY_SECRET=...
CDP_WALLET_SECRET=...
RESOURCE_SERVER_URL=http://localhost:8402
```

## Server examples (receivers)

Each server has its own `package.json` with framework-specific dependencies.

| Directory | Framework | Entry point |
| --------- | --------- | ----------- |
| `servers/express/` | Express | `pnpm start` |
| `servers/hono/` | Hono | `pnpm start` |
| `servers/next/` | Next.js | `pnpm dev` |

```bash
# Example: Express server
cd x402/servers/express
cp .env.example .env  # fill in CDP credentials
pnpm install
pnpm start
```

The express and hono servers auto-provision a receiver wallet — no `PAY_TO` address needed. The hono and next servers require a `PAY_TO` env var (existing EVM address to receive payments).
