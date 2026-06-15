---
"@coinbase/cdp-sdk": minor
"@coinbase/x402-express": minor
"@coinbase/x402-hono": minor
"@coinbase/x402-next": minor
---

Fold x402 payment protocol support into `@coinbase/cdp-sdk`

**New `@coinbase/cdp-sdk/x402` subpath** — all x402 client, facilitator, signer, server, Bazaar, guardrails, and extension APIs are now available via:

```ts
import { createCdpX402Client, createCdpFacilitatorClient, toX402Signer } from "@coinbase/cdp-sdk/x402";
```

Key additions:

- **Canonical network registry** (`src/networks/`) — single source of truth for CAIP-2 IDs, USDC addresses (EVM + SVM), chainId ↔ CDP-network maps, and RPC endpoints. Replaces scattered constants across the codebase.
- **`SmartAccountAlreadyExistsError`** — typed error thrown by `evm.getOrCreateSmartAccount()` when an owner EOA already has a smart wallet registered under a different name.
- **`toX402Signer(account)`** — overloaded adapter that converts any CDP account type (`EvmServerAccount`, `EvmSmartAccount`, `SolanaAccount`) into the correct x402-compatible signer.
- **`createCdpFacilitatorClient({ network: "devnet" })`** — select the CDP devnet facilitator endpoint.
- **Bazaar client** backed by the generated OpenAPI client (no raw `fetch`).
- **Middleware packages** (`@coinbase/x402-express`, `@coinbase/x402-hono`, `@coinbase/x402-next`) now depend on `@coinbase/cdp-sdk` instead of the standalone `@coinbase/x402` package.
