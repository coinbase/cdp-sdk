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
