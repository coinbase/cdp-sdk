# CDP SDK Examples

## Setup

Follow these steps to get started:

1. Get a CDP API key and wallet secret from the [CDP Portal](https://portal.cdp.coinbase.com/access/api)
1. Fill in your API key and wallet secret in `.env.example`, then run `mv .env.example .env`
1. In the root `typescript/` folder, run `pnpm install && pnpm build`. You only need to do this once
1. In the `examples/typescript` folder, run `pnpm install` to install the dependencies

## Usage

To run an example, use `pnpm tsx` followed by the path to the example file, for example:

```bash
pnpm tsx evm/createAccount.ts
```

## x402 Payment Protocol

Examples for paying for and gating x402-protected APIs with CDP-managed wallets live in [`x402/`](./x402). See the [x402 examples README](./x402/README.md) for setup, funding, and environment variables.

- [`x402/clients/payForApi.ts`](./x402/clients/payForApi.ts) — pay for an x402-protected API with a CDP-managed wallet using `CdpX402Client`.
- [`x402/clients/payForApiWithSpendControls.ts`](./x402/clients/payForApiWithSpendControls.ts) — the same flow with per-payment and cumulative spend caps, an `allowedNetworks` allowlist, and an `onApproachingLimit` callback.
- [`x402/clients/x402DevMigration.ts`](./x402/clients/x402DevMigration.ts) — migrate from a self-managed private key to a CDP signer, shown two ways.
- [`x402/servers/express`](./x402/servers/express) — an Express resource server that gates a paid route using `createX402Server` and the CDP-hosted facilitator.
