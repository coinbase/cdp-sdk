# x402 reference

Reference documentation for the `@coinbase/cdp-sdk/x402` subpath.

- [Environment setup](#environment-setup)
- [Route configuration](#route-configuration)
- [Spend controls](#spend-controls)

---

## Environment setup

All required credentials are passed as environment variables. Explicit values in code always take precedence.

### Buyer (client) credentials

Used by `CdpX402Client` / `createCdpX402Client` and any code that calls into the CDP wallet or signing APIs.

| Variable                 | Required       | Default                | Description                                                                           |
| ------------------------ | -------------- | ---------------------- | ------------------------------------------------------------------------------------- |
| `CDP_API_KEY_ID`         | Yes            | —                      | CDP API key ID                                                                        |
| `CDP_API_KEY_SECRET`     | Yes            | —                      | CDP API key secret                                                                    |
| `CDP_WALLET_SECRET`      | Yes            | —                      | Wallet secret (seed encryption key)                                                   |
| `CDP_WALLET_TYPE`        | No             | `cdp-eoa`              | Wallet backend: `cdp-eoa` (Server Wallet EOA) or `cdp-smart` (Smart Contract Wallet)  |
| `CDP_ACCOUNT_NAME`       | No             | `x402-server-wallet-1` | Named CDP account for the paying wallet                                               |
| `CDP_OWNER_ACCOUNT_NAME` | cdp-smart only | —                      | Owner EOA account name when `CDP_WALLET_TYPE=cdp-smart`                               |
| `CDP_RPC_URLS`           | No             | —                      | JSON object overriding public RPC endpoints, keyed by CAIP-2 ID                       |
| `CDP_DISABLE_PREFLIGHT_BALANCE_CHECK` | No | `false`           | Set to `true` to skip the pre-payment balance check                                   |

#### Obtaining credentials

1. Sign in at [portal.cdp.coinbase.com](https://portal.cdp.coinbase.com/)
2. Navigate to **Dashboard** → **API Keys** and create a new key — copy the key ID and secret.
3. Navigate to **Wallets** → **Server Wallets** → **Accounts**, create a new wallet secret, and copy it — it is shown only once.

### Seller (facilitator) credentials

Used by `createCdpFacilitatorClient`, `createCdpResourceServer`, `createCdpExpressMiddleware`, `createCdpHonoMiddleware`, and `createCdpPaymentProxy`.

| Variable                    | Required                          | Default | Description                                    |
| --------------------------- | --------------------------------- | ------- | ---------------------------------------------- |
| `CDP_SERVER_API_KEY_ID`     | Yes                               | —       | CDP API key ID for the seller                  |
| `CDP_SERVER_API_KEY_SECRET` | Yes                               | —       | CDP API key secret for the seller              |
| `CDP_SERVER_WALLET_SECRET`  | `createCdpResourceServer` only    | —       | Wallet secret for receiver wallet provisioning |

> The SDKs fall back to `CDP_API_KEY_ID` / `CDP_API_KEY_SECRET` / `CDP_WALLET_SECRET` if the `CDP_SERVER_*` equivalents are not set, but using server-prefixed names avoids credential collisions when buyer and seller code run in the same process.

### Server-side wallet configuration

When using `createCdpResourceServer`, the receiver wallet is configured independently using `CDP_SERVER_*` wallet variables:

| Variable                        | Required       | Default                  | Description                                       |
| ------------------------------- | -------------- | ------------------------ | ------------------------------------------------- |
| `CDP_SERVER_WALLET_TYPE`        | No             | `cdp-eoa`                | Wallet backend: `cdp-eoa` or `cdp-smart`          |
| `CDP_SERVER_ACCOUNT_NAME`       | No             | `x402-receiver-wallet-1` | Named CDP account for the receiver wallet         |
| `CDP_SERVER_OWNER_ACCOUNT_NAME` | cdp-smart only | —                        | Owner EOA account name for Smart Contract Wallets |

### Example `.env` (buyer)

```bash
CDP_API_KEY_ID=your-cdp-api-key-id
CDP_API_KEY_SECRET=your-cdp-api-key-secret
CDP_WALLET_SECRET=your-wallet-secret

# Optional
CDP_WALLET_TYPE=cdp-eoa  # cdp-eoa | cdp-smart
# CDP_ACCOUNT_NAME=my-wallet
# CDP_OWNER_ACCOUNT_NAME=my-owner-wallet   # required for cdp-smart
```

### Example `.env` (seller with auto-provisioned receiver)

```bash
CDP_SERVER_API_KEY_ID=your-cdp-api-key-id
CDP_SERVER_API_KEY_SECRET=your-cdp-api-key-secret
CDP_SERVER_WALLET_SECRET=your-wallet-secret
```

When running buyer and seller in the same process:

```bash
# Buyer credentials
CDP_API_KEY_ID=your-buyer-api-key-id
CDP_API_KEY_SECRET=your-buyer-api-key-secret
CDP_WALLET_SECRET=your-buyer-wallet-secret

# Seller credentials
CDP_SERVER_API_KEY_ID=your-seller-api-key-id
CDP_SERVER_API_KEY_SECRET=your-seller-api-key-secret
CDP_SERVER_WALLET_SECRET=your-seller-wallet-secret
```

---

## Route configuration

Route configuration tells the CDP server which HTTP endpoints require payment, what price to charge, which networks to accept, and where to send funds.

### CDP route format

The CDP format is the simplest option. Supply a `price` and optional metadata — the server auto-provisions a CDP receiver wallet and fills in all x402 internals automatically.

```typescript
import { createCdpResourceServer } from "@coinbase/cdp-sdk/x402";

const server = await createCdpResourceServer({
  routes: {
    "GET /report": {
      price: "$0.01",
      description: "AI-generated report",
    },
    "POST /generate": {
      price: "$0.05",
      description: "Image generation endpoint",
      // Accept payments on Base Sepolia only (default is Base + Solana mainnet)
      networks: ["eip155:84532"],
      maxTimeoutSeconds: 60,
    },
  },
});
```

### `CdpRouteConfig` fields

| Field               | Type                | Required | Default                       | Description                                                                          |
| ------------------- | ------------------- | -------- | ----------------------------- | ------------------------------------------------------------------------------------ |
| `price`             | `string`            | Yes      | —                             | Payment amount, e.g. `"$0.01"`                                                       |
| `description`       | `string`            | No       | —                             | Human-readable description of the resource                                           |
| `networks`          | `string[]`          | No       | Base mainnet + Solana mainnet | CAIP-2 network IDs to accept payments on                                             |
| `maxTimeoutSeconds` | `number`            | No       | `300`                         | Seconds before a payment token expires                                               |
| `scheme`            | `"exact" \| "upto"` | No       | `"exact"`                     | Payment scheme; `"upto"` allows the buyer to pay up to the stated amount (EVM only)  |
| `extensions`        | `CdpExtensions`     | No       | Auto-injected                 | Extension overrides (Bazaar, gas sponsoring)                                         |

### Default networks

When `networks` is omitted, the route accepts payments on:

- `eip155:8453` — Base mainnet (EVM)
- `solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp` — Solana mainnet

```typescript
// Base Sepolia only
networks: ["eip155:84532"];

// Base + Polygon
networks: ["eip155:8453", "eip155:137"];

// Solana devnet only
networks: ["solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1"];
```

### Route key format

Route keys use the `"METHOD /path"` convention:

```
"GET /report"
"POST /users/:id"
"DELETE /sessions"
```

### Config file

`createCdpResourceServer` can load routes from a JSON file via `configPath`:

```json
{
  "routes": {
    "GET /report": { "price": "$0.01", "description": "AI-generated report" },
    "POST /generate": { "price": "$0.05", "networks": ["eip155:8453"] }
  }
}
```

```typescript
const server = await createCdpResourceServer({ configPath: "./x402.config.json" });
```

Inline config fields take precedence over file config when both are provided.

### Auto-injected extensions

`createCdpResourceServer` automatically injects into every route:

- **Bazaar discovery** — registers the route with the CDP Bazaar discovery index.
- **EIP-2612 gas sponsoring** — enables SCW gas sponsorship for EVM payments.
- **ERC-20 approval gas sponsoring** — enables ERC-20 approval sponsorship.

To override Bazaar metadata with query parameter examples or output schemas:

```typescript
import { CDP_EXTENSION_BAZAAR } from "@coinbase/cdp-sdk/x402";

routes: {
  "GET /search": {
    price: "$0.01",
    extensions: {
      [CDP_EXTENSION_BAZAAR]: {
        info: {
          input: { type: "http", method: "GET", queryParams: { q: "example" } },
          output: { type: "json", example: { results: [] } },
        },
        routeTemplate: "/search",
      },
    },
  },
},
```

---

## Spend controls

An opt-in API for limiting what and how much an x402 client will pay. Spend controls sit on top of the `x402Client` hook system.

### Quick start

```typescript
import { CdpX402Client } from "@coinbase/cdp-sdk/x402";

// Always use the contract address — "usdc" and "0x036cbd…" are different identifiers.
const USDC_BASE_SEPOLIA = "0x036cbd53842c5426634e7929541ec2318f3dcf7e";

const client = new CdpX402Client({
  spendControls: {
    maxAmountPerPayment: { atomic: 2_000_000n, asset: USDC_BASE_SEPOLIA },
    maxCumulativeSpend: { atomic: 10_000_000n, asset: USDC_BASE_SEPOLIA },
    maxCumulativeSpendWindow: "24h",
    allowedNetworks: ["eip155:84532"],
    allowedAssets: [USDC_BASE_SEPOLIA],
    allowedPayees: ["0xMerchantAddress"],
    onApproachingLimit: (spent, limit) =>
      console.warn(`approaching cap: spent=${spent.atomic}/${limit.atomic}`),
  },
});
```

### Applying to your own `x402Client`

```typescript
import { x402Client } from "@x402/core/client";
import { applySpendControls } from "@coinbase/cdp-sdk/x402";

const client = new x402Client();
// register your schemes here…

applySpendControls(client, {
  maxAmountPerPayment: { atomic: 2_000_000n, asset: "0x036cbd…" },
});
```

`applySpendControls` may only be called once per client — a second call throws `SpendControlError` to prevent double-counting.

### `SpendControls` reference

| Field                        | Type                     | Description                                                                              |
| ---------------------------- | ------------------------ | ---------------------------------------------------------------------------------------- |
| `maxAmountPerPayment`        | `Amount`                 | Hard cap on a single payment's atomic amount.                                            |
| `maxCumulativeSpend`         | `Amount`                 | Cap on total spend for a single asset. `asset` is **required**.                          |
| `maxCumulativeSpendWindow`   | `Duration`               | Rolling window for the cumulative cap (e.g. `"24h"`, `"7d"`). Omit for a lifetime cap.   |
| `allowedNetworks`            | `string[]`               | Allow-list of CAIP-2 network IDs. Empty/omitted means allow all.                         |
| `allowedAssets`              | `string[]`               | Allow-list of asset contract addresses. Empty/omitted means allow all.                   |
| `allowedPayees`              | `string[]`               | Allow-list of payee addresses. Empty/omitted means allow all.                            |
| `onApproachingLimit`         | `(spent, limit) => void` | Notifier fired when the running total crosses a threshold.                               |
| `approachingLimitThresholds` | `number[]`               | Thresholds as fractions of the cap (default `[0.8, 0.95]`).                              |
| `maxLedgerEntries`           | `number`                 | Max entries in the in-memory ledger (default `10_000`).                                  |
| `store`                      | `SpendStore`             | Custom storage backend (e.g. Redis). Defaults to in-memory.                              |

### `Amount`

```typescript
type Amount = {
  atomic: bigint | string; // Amount in the asset's smallest denomination
  asset?: string;          // ERC-20 contract address or SPL mint
};
```

**Always use the contract address.** There is no symbol-to-address lookup — `"usdc"` and `"0x036cbd…"` are treated as different assets.

### `Duration`

Accepts a number (milliseconds) or a shorthand string:

| Shorthand | Meaning          |
| --------- | ---------------- |
| `"500ms"` | 500 milliseconds |
| `"30s"`   | 30 seconds       |
| `"5m"`    | 5 minutes        |
| `"1h"`    | 1 hour           |
| `"24h"`   | 24 hours         |
| `"7d"`    | 7 days           |

### Error handling

```typescript
import { CdpX402Client, SpendControlError } from "@coinbase/cdp-sdk/x402";

const client = new CdpX402Client({ spendControls: { /* ... */ } });
const fetchWithPayment = client.wrapFetch();

try {
  await fetchWithPayment("https://api.example.com/paid-endpoint");
} catch (err) {
  if (err instanceof SpendControlError) {
    switch (err.code) {
      case "per_payment_cap":
        console.error("Payment exceeds per-payment cap:", err.details);
        break;
      case "cumulative_cap":
        console.error("Cumulative spend cap reached:", err.details);
        break;
      case "network_not_allowed":
        console.error("Network not in allowedNetworks:", err.details);
        break;
      case "asset_not_allowed":
        console.error("Asset not in allowedAssets:", err.details);
        break;
      case "payee_not_allowed":
        console.error("Payee not in allowedPayees:", err.details);
        break;
    }
  }
}
```

### Custom storage backend

The default in-memory ledger is lost when the process restarts. Implement `SpendStore` for durable tracking:

```typescript
import { applySpendControls, type SpendStore, type SpendLedgerEntry } from "@coinbase/cdp-sdk/x402";
import { redis } from "./redis-client.js";

const redisStore: SpendStore = {
  async load() {
    const raw = await redis.lrange("x402:spend-ledger", 0, -1);
    return raw.map((s) => JSON.parse(s) as SpendLedgerEntry);
  },
  async append(entry) {
    await redis.rpush("x402:spend-ledger", JSON.stringify(entry));
  },
  async prune(olderThanMs) {
    const cutoff = Date.now() - olderThanMs;
    const all = await this.load();
    const kept = all.filter((e) => e.at >= cutoff);
    await redis.del("x402:spend-ledger");
    if (kept.length > 0) {
      await redis.rpush("x402:spend-ledger", ...kept.map((e) => JSON.stringify(e)));
    }
  },
  async removeEntry(entry) {
    const all = await this.load();
    const idx = [...all].reverse().findIndex(
      (e) => e.at === entry.at && e.asset === entry.asset && e.atomicAmount === entry.atomicAmount,
    );
    if (idx !== -1) {
      all.splice(all.length - 1 - idx, 1);
      await redis.del("x402:spend-ledger");
      if (all.length > 0) {
        await redis.rpush("x402:spend-ledger", ...all.map((e) => JSON.stringify(e)));
      }
    }
  },
};

applySpendControls(client, {
  maxCumulativeSpend: { atomic: 10_000_000n, asset: USDC_BASE },
  store: redisStore,
});
```
