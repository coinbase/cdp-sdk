# x402 Examples

[x402](https://www.x402.org/) is an HTTP-native payment protocol: a resource server responds
with `402 Payment Required`, the client signs a payment and retries. These examples show what
the CDP SDK adds on top:

- **CDP-managed wallets** — no private keys to store; wallets are provisioned and signed by CDP.
- **Hosted facilitator** — `createCdpFacilitatorClient()` is a drop-in for a self-hosted facilitator.
- **Spend controls** — per-payment and rolling caps, network/asset/payee allowlists, and an
  approaching-limit callback.

## Prerequisites

Complete the setup in the [parent examples README](../README.md) first. In short, set these in
your `.env`:

- `CDP_API_KEY_ID`
- `CDP_API_KEY_SECRET`
- `CDP_WALLET_SECRET`

## Funding

The client examples pay in USDC on Base Sepolia, so the wallet needs testnet USDC before it can
pay. Each client prints its EVM address on startup. Fund that address using any of:

- **CDP Faucet (portal):** https://portal.cdp.coinbase.com -> "Onchain Tools" -> "Faucet"
- **Programmatically:** `cdp.evm.requestFaucet({ address, network: "base-sepolia", token: "usdc" })`
- **Auto-fund shortcut:** run `payForApi.ts` with `X402_FUND_FROM_FAUCET=true` to request USDC from
  the CDP faucet on startup.

The CDP faucet funds the same wallets the CDP x402 facilitator settles against — no separate
faucet is needed.

## Clients

Run from the `examples/typescript` directory. Every client uses the same CDP primitive —
`CdpX402Client` — which extends the base `x402Client`, so it drops into any x402 transport wrapper
(`fetch`, `axios`, MCP) unchanged.

**HTTP:**

- `pnpm tsx x402/clients/payForApi.ts` — pay for an x402-protected API over **fetch**
  (`wrapFetchWithPayment`). Prints the wallet address and supports the `X402_FUND_FROM_FAUCET=true`
  auto-fund shortcut.
- `pnpm tsx x402/clients/payForApiWithAxios.ts` — the same flow over **axios**
  (`wrapAxiosWithPayment`). Only the transport differs.
- `pnpm tsx x402/clients/payForApiWithSpendControls.ts` — fetch, plus per-payment and cumulative
  spend caps, an `allowedNetworks` allowlist, and an `onApproachingLimit` callback.
- `pnpm tsx x402/clients/x402DevMigration.ts` — migrating from a self-managed private key, shown two
  ways: swapping `x402Client` for `CdpX402Client`, and slotting a CDP signer into an existing
  `x402Client`.

**MCP** (connect to the MCP server below):

- `pnpm tsx x402/clients/mcp/simple.ts` — clean example: wrap an MCP client with `CdpX402Client` via
  `wrapMCPClientWithPayment`, then call a free and a paid tool.
- `pnpm tsx x402/clients/mcp/chatbot.ts` — an interactive chatbot where **Claude** (Anthropic SDK)
  decides when to call the paid MCP tools and the CDP wallet settles payment automatically. Needs
  `ANTHROPIC_API_KEY`.

## Servers

Each server is a self-contained workspace package with its own dependencies, so it runs differently
from the client examples — install and start it from its own directory.

The HTTP servers all expose the same paid `GET /report` route on http://localhost:8402 and show two
CDP approaches: (1) drop `createCdpFacilitatorClient()` into an existing setup, and (2) the
`createX402Server` one-liner that also provisions the receiver wallet.

```bash
# Express
cd x402/servers/express && pnpm install && APPROACH=2 pnpm start

# Hono (identical CDP wiring, different framework)
cd x402/servers/hono && pnpm install && APPROACH=2 pnpm start

# Next.js (App Router; withX402 on GET /api/report)
cd x402/servers/next && pnpm install && PAY_TO=0x... pnpm dev
```

Approach 1 (and the Next.js example) needs `CDP_API_KEY_ID`, `CDP_API_KEY_SECRET`, and `PAY_TO`
(the server receives payments, so no wallet secret). Approach 2 also needs `CDP_WALLET_SECRET` to
provision the receiver wallet, and prints the provisioned addresses instead of using `PAY_TO`.

**Bazaar server** — loads its paid `GET /weather/:city` route from `x402.config.json`.
`createX402Server` connects it to the CDP Facilitator and makes the route discoverable in the CDP
Bazaar automatically:

```bash
cd x402/servers/bazaar && pnpm install && pnpm start
```

It needs `CDP_API_KEY_ID`, `CDP_API_KEY_SECRET`, and `CDP_WALLET_SECRET` to provision its receiver
wallet.

The Express server's Approach 2 additionally exposes `GET /usage`, which demonstrates the `upto`
scheme (usage-based billing): the client authorizes a ceiling of `$0.10` and the handler settles
only the amount actually used via `setSettlementOverrides`. `createX402Server` auto-registers the
`upto` scheme, so the route just sets `scheme: "upto"`. Pay it with the existing fetch client —
`CdpX402Client` handles `upto` automatically — by pointing it at the route:

```bash
X402_API_URL=http://localhost:8402/usage pnpm tsx x402/clients/payForApi.ts
```

**MCP server** — exposes paid tools over SSE using the CDP hosted facilitator and a CDP-managed
receiver wallet:

```bash
cd x402/servers/mcp && pnpm install && pnpm start   # http://localhost:4022
```

It provisions a CDP receiver wallet (so it needs `CDP_WALLET_SECRET`, or set `PAY_TO` to skip
provisioning) and serves `generate_report` (paid, $0.01) and `ping` (free). Point the MCP clients at
it with `MCP_SERVER_URL` (defaults to `http://localhost:4022`).

## Environment variables

- `CDP_API_KEY_ID`, `CDP_API_KEY_SECRET`, `CDP_WALLET_SECRET` — CDP credentials (see Prerequisites).
- `ANTHROPIC_API_KEY` — (MCP chatbot only) Claude API key for `x402/clients/mcp/chatbot.ts`.
- `X402_API_URL` — override the x402-protected URL the HTTP clients call. Defaults to
  `https://x402.vercel.app/protected`.
- `X402_FUND_FROM_FAUCET` — set to `true` in `payForApi.ts` to auto-request USDC on startup.
- `MCP_SERVER_URL` — (MCP clients) the MCP server URL. Defaults to `http://localhost:4022`.
- `CDP_X402_CLIENT_ENVIRONMENT` — `"production"` (default, Base mainnet) or `"development"` (Base
  Sepolia). Controls which Base network `CdpX402Client` prescribes by default; overridden by the
  `environment` config option. These examples pass `environment: "development"` explicitly, so this
  env var isn't required to run them as-is.
- Non-Base RPC URLs — pass them via the `networkSchemes` config option on `CdpX402Client`, e.g.
  `new CdpX402Client({ networkSchemes: [{ network: "polygon", rpcUrl: "https://your-rpc-provider.example.com/polygon", scheme: { exact: true } }] })`.
  Base and Base Sepolia resolve an RPC automatically via your CDP project's node endpoint; CDP
  doesn't host RPCs for other networks, so those require an explicit `rpcUrl` from your own RPC
  provider.
- `PAY_TO` — (servers) the EVM address that should receive payments (required for Approach 1 and the
  Next.js server; optional for the MCP server).
- `PORT` — (MCP server only) override the listen port. Defaults to `4022`.
