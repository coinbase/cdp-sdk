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

Run from the `examples/typescript` directory:

- `pnpm tsx x402/clients/payForApi.ts` — pay for an x402-protected API with a CDP-managed wallet.
  Prints the wallet address and supports the `X402_FUND_FROM_FAUCET=true` auto-fund shortcut.
- `pnpm tsx x402/clients/payForApiWithSpendControls.ts` — the same flow with per-payment and
  cumulative spend caps, an `allowedNetworks` allowlist, and an `onApproachingLimit` callback.
- `pnpm tsx x402/clients/x402DevMigration.ts` — migrating from a self-managed private key, shown
  two ways: swapping `x402Client` for `CdpX402Client`, and slotting a CDP signer into an existing
  `x402Client`.

## Server

The Express server is a self-contained workspace package with its own dependencies, so it runs
differently from the client examples:

```bash
cd x402/servers/express
pnpm install
PAY_TO=0x... pnpm start
```

It only needs `CDP_API_KEY_ID` and `CDP_API_KEY_SECRET` (no wallet secret — the server receives
payments rather than making them), plus `PAY_TO` for the address that should receive them. It
listens on http://localhost:8402 with a paid `GET /report` route.

## Environment variables

- `CDP_API_KEY_ID`, `CDP_API_KEY_SECRET`, `CDP_WALLET_SECRET` — CDP credentials (see Prerequisites).
- `X402_API_URL` — override the x402-protected URL the clients call. Defaults to
  `https://x402.org/protected`.
- `X402_FUND_FROM_FAUCET` — set to `true` in `payForApi.ts` to auto-request USDC on startup.
- `CDP_X402_RPC_URLS` — JSON object mapping CAIP-2 network IDs to RPC URLs, e.g.
  `{"eip155:8453":"https://base-mainnet.g.alchemy.com/v2/KEY"}`. Required for chains without a
  bundled default RPC.
- `PAY_TO` — (server only) the EVM address that should receive payments.
