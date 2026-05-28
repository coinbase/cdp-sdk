# Spend controls

An opt-in API for limiting what and how much an x402 client will pay for. Spend controls
sit on top of the `x402Client` hook system so users don't need to implement
filtering or cap enforcement yourself.

Spend controls are available in both the TypeScript (`@coinbase/x402`) and Python
(`cdp-x402`) SDKs. This document covers TypeScript first; see
[Python](#python-cdp-x402) at the bottom for the Python equivalent.

The JSDoc on each export is the authoritative reference — this document is a
quick orientation.

## Quick start

Pass `spendControls` to `CdpX402Client` / `createCdpX402Client`:

```ts
import { CdpX402Client } from "@coinbase/x402";

// Always use the contract address — see "Asset identifiers" below.
const USDC_BASE_SEPOLIA = "0x036cbd53842c5426634e7929541ec2318f3dcf7e";

const client = new CdpX402Client({
  spendControls: {
    // Max per individual payment (2 USDC; USDC has 6 decimals).
    maxAmountPerPayment: { atomic: 2_000_000n, asset: USDC_BASE_SEPOLIA },

    // Max total spend over the rolling window (10 USDC).
    maxCumulativeSpend: { atomic: 10_000_000n, asset: USDC_BASE_SEPOLIA },
    maxCumulativeSpendWindow: "24h",

    // Allow-lists. Empty / omitted means "allow all".
    allowedNetworks: ["eip155:84532"],
    allowedAssets: [USDC_BASE_SEPOLIA],
    allowedPayees: ["0xMerchantAddress"],

    // Called once per threshold crossing per window. Errors thrown here
    // are caught and logged and won't block a payment.
    onApproachingLimit: (spent, limit) =>
      console.warn(`approaching cap: spent=${spent.atomic}/${limit.atomic}`),
  },
});
```

## Using spend controls with your own `x402Client`

If you build an `x402Client` yourself, call `applySpendControls` directly:

```ts
import { x402Client } from "@x402/core/client";
import { applySpendControls } from "@coinbase/x402";

const client = new x402Client();
// register your schemes here…

applySpendControls(client, {
  maxAmountPerPayment: { atomic: 2_000_000n, asset: "0x036cbd…" },
});
```

`applySpendControls` can only be called once per client — a second call throws
a `SpendControlError` to prevent accidentally double-counting spend.

## Configuration reference

### `SpendControls`

| Field                        | Type                     | Description                                                                            |
| ---------------------------- | ------------------------ | -------------------------------------------------------------------------------------- |
| `maxAmountPerPayment`        | `Amount`                 | Hard cap on a single payment's atomic amount.                                          |
| `maxCumulativeSpend`         | `Amount`                 | Cap on total spend for a single asset. `asset` is **required**.                        |
| `maxCumulativeSpendWindow`   | `Duration`               | Rolling window for the cumulative cap (e.g. `"24h"`, `"7d"`). Omit for a lifetime cap. |
| `allowedNetworks`            | `string[]`               | Allow-list of CAIP-2 network IDs. Empty/omitted means allow all.                       |
| `allowedAssets`              | `string[]`               | Allow-list of asset contract addresses. Empty/omitted means allow all.                 |
| `allowedPayees`              | `string[]`               | Allow-list of payee addresses. Empty/omitted means allow all.                          |
| `onApproachingLimit`         | `(spent, limit) => void` | Notifier fired when the running total crosses a threshold.                             |
| `approachingLimitThresholds` | `number[]`               | Thresholds as fractions of the cap (default `[0.8, 0.95]`).                            |
| `maxLedgerEntries`           | `number`                 | Max entries in the in-memory ledger (default `10_000`).                                |
| `store`                      | `SpendStore`             | Custom storage backend (e.g. Redis). Defaults to in-memory.                            |

### `Amount`

```ts
type Amount = {
  atomic: bigint | string; // Amount in the asset's smallest denomination
  asset?: string; // ERC-20 contract address or SPL mint
};
```

**Always use the contract address as the asset identifier.** There is no
symbol-to-address lookup — `"usdc"` and `"0x036cbd…"` are treated as different
assets. Use the same address that will appear in `PaymentRequirements.asset`.

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

## Exports

All of the following are available from `@coinbase/x402` (and also from
`@coinbase/x402/guardrails` for the guard-only surface):

- `applySpendControls(client, controls)` — attaches controls to a client.
- `SpendControls` — top-level configuration type.
- `SpendControlError` — typed error thrown on violations; check `err.code`.
- `SpendTracker` — the ledger backing the cumulative cap.
- `Amount`, `Duration`, `Asset`, `Address` — supporting types.
- `parseAmount`, `parseDuration` — parsers for the above types.
- `normalizeAsset`, `normalizeNetwork`, `normalizePayee` — address/network
  normalization helpers.
- `SpendStore` — interface for custom storage backends.

## How it works

- **Typed errors.** Violations throw `SpendControlError` with a `code` field
  (`"per_payment_cap"`, `"cumulative_cap"`, `"already_applied"`,
  `"configuration_invalid"`, `"ledger_capacity_exceeded"`,
  `"amount_unparseable"`, …) and structured context in `err.details`.
- **Allow-lists run first.** `allowedNetworks` / `allowedAssets` /
  `allowedPayees` filter payment options before one is selected. Disallowed
  payees are never presented to the wallet.
- **Per-payment cap.** Checked before the wallet signs. Throws
  `SpendControlError(code: "per_payment_cap")` on violation.
- **Cumulative cap.** Tracked per asset — the `asset` field is **required** on
  `maxCumulativeSpend`. Each asset uses different base units (USDC, ETH wei,
  etc.), so a cross-asset total would be meaningless. Throws
  `SpendControlError(code: "cumulative_cap")` at runtime, or
  `"amount_unparseable"` at setup time if `asset` is missing.
- **Concurrency safe.** The cap check and the spend record happen together
  under a per-asset lock, so concurrent payments can't collectively slip past
  the cap. If the underlying payment fails after the record is written, the
  record is rolled back automatically.
- **Single application.** `applySpendControls` may only be called once per
  client — a second call throws `SpendControlError` to prevent double-counting.
- **Address casing.** EVM addresses are compared case-insensitively; Solana
  addresses are case-sensitive.
- **Threshold notifications.** `onApproachingLimit(spent, limit)` fires when
  the running total crosses a threshold (default `[0.8, 0.95]`). Fires again
  if the total dips below a threshold and crosses it again (e.g. after the
  window rolls over). A throwing callback won't block a payment.
- **Custom storage.** Defaults to in-memory. Implement `SpendStore` to use a
  persistent backend (Redis, database, etc.) without changing anything else.
- **Asset identifiers.** All comparisons go through `normalizeAsset`, which
  lower-cases EVM contract addresses and passes everything else through
  unchanged. **There is no symbol-to-address lookup** — `"usdc"` and
  `"0x036cbd…"` are different identifiers. Always use the contract address (or
  SPL mint) that will appear in `PaymentRequirements.asset`.

## Error handling

```ts
import { CdpX402Client, SpendControlError } from "@coinbase/x402";

const client = new CdpX402Client({
  spendControls: {
    /* ... */
  },
});
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

## Custom storage backend

The default in-memory ledger is lost when the process restarts. For durable
tracking, implement `SpendStore`:

```ts
import {
  applySpendControls,
  type SpendStore,
  type SpendLedgerEntry,
} from "@coinbase/x402";
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
      await redis.rpush(
        "x402:spend-ledger",
        ...kept.map((e) => JSON.stringify(e)),
      );
    }
  },
  async removeEntry(entry) {
    // Remove the most recent matching entry on rollback.
    const all = await this.load();
    const idx = [...all]
      .reverse()
      .findIndex(
        (e) =>
          e.at === entry.at &&
          e.asset === entry.asset &&
          e.atomicAmount === entry.atomicAmount,
      );
    if (idx !== -1) {
      all.splice(all.length - 1 - idx, 1);
      await redis.del("x402:spend-ledger");
      if (all.length > 0) {
        await redis.rpush(
          "x402:spend-ledger",
          ...all.map((e) => JSON.stringify(e)),
        );
      }
    }
  },
};

applySpendControls(client, {
  maxCumulativeSpend: { atomic: 10_000_000n, asset: USDC_BASE },
  store: redisStore,
});
```

---

## Python (`cdp-x402`)

The Python SDK provides full spend-control parity under snake_case names.

### Quick start

```python
from cdp_x402 import CdpX402Client, CdpX402ClientConfig, SpendControls, Amount

USDC_BASE_SEPOLIA = "0x036cbd53842c5426634e7929541ec2318f3dcf7e"

client = CdpX402Client(
    CdpX402ClientConfig(
        spend_controls=SpendControls(
            max_amount_per_payment=Amount(atomic=2_000_000, asset=USDC_BASE_SEPOLIA),
            max_cumulative_spend=Amount(atomic=10_000_000, asset=USDC_BASE_SEPOLIA),
            max_cumulative_spend_window="24h",
            allowed_networks=["eip155:84532"],
            allowed_assets=[USDC_BASE_SEPOLIA],
            allowed_payees=["0xMerchantAddress"],
            on_approaching_limit=lambda spent, limit: print(
                f"Approaching cap: {spent.atomic}/{limit.atomic}"
            ),
        )
    )
)
```

### Using spend controls with your own client

```python
from cdp_x402 import apply_spend_controls, SpendControls, Amount

apply_spend_controls(client, SpendControls(
    max_amount_per_payment=Amount(atomic=2_000_000, asset="0x036cbd…"),
))
```

### `SpendControls` fields

| Field                          | Type                               | Description                                                                            |
| ------------------------------ | ---------------------------------- | -------------------------------------------------------------------------------------- |
| `max_amount_per_payment`       | `Amount`                           | Hard cap on a single payment's atomic amount.                                          |
| `max_cumulative_spend`         | `Amount`                           | Cap on total spend for a single asset. `asset` is **required**.                        |
| `max_cumulative_spend_window`  | `Duration`                         | Rolling window for the cumulative cap (e.g. `"24h"`, `"7d"`). Omit for a lifetime cap. |
| `allowed_networks`             | `list[str]`                        | Allow-list of CAIP-2 network IDs. Empty/omitted means allow all.                       |
| `allowed_assets`               | `list[str]`                        | Allow-list of asset contract addresses. Empty/omitted means allow all.                 |
| `allowed_payees`               | `list[str]`                        | Allow-list of payee addresses. Empty/omitted means allow all.                          |
| `on_approaching_limit`         | `Callable[[Amount, Amount], None]` | Notifier fired when the running total crosses a threshold.                             |
| `approaching_limit_thresholds` | `list[float]`                      | Thresholds as fractions of the cap (default `[0.8, 0.95]`).                            |
| `max_ledger_entries`           | `int`                              | Max entries in the in-memory ledger (default `10_000`).                                |
| `store`                        | `SpendStore`                       | Custom storage backend. Defaults to in-memory.                                         |

### Error handling

```python
from cdp_x402 import SpendControlError

try:
    async with httpx.AsyncClient(transport=transport) as http:
        response = await http.get("https://api.example.com/paid-endpoint")
except SpendControlError as err:
    if err.code == "per_payment_cap":
        print("Payment exceeds per-payment cap:", err.details)
    elif err.code == "cumulative_cap":
        print("Cumulative spend cap reached:", err.details)
    elif err.code == "network_not_allowed":
        print("Network not in allowed_networks:", err.details)
```

### Custom storage backend

Subclass `SpendStore` to use a persistent backend:

```python
from cdp_x402 import SpendStore, SpendLedgerEntry, apply_spend_controls, SpendControls, Amount

class RedisSpendStore(SpendStore):
    async def load(self) -> list[SpendLedgerEntry]:
        raw = await redis.lrange("x402:spend-ledger", 0, -1)
        return [SpendLedgerEntry(**json.loads(s)) for s in raw]

    async def append(self, entry: SpendLedgerEntry) -> None:
        await redis.rpush("x402:spend-ledger", json.dumps(entry.__dict__))

    async def prune(self, older_than_ms: int) -> None:
        cutoff = time.time() * 1000 - older_than_ms
        entries = [e for e in await self.load() if e.at >= cutoff]
        await redis.delete("x402:spend-ledger")
        for e in entries:
            await redis.rpush("x402:spend-ledger", json.dumps(e.__dict__))

USDC_BASE = "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913"

apply_spend_controls(client, SpendControls(
    max_cumulative_spend=Amount(atomic=10_000_000, asset=USDC_BASE),
    store=RedisSpendStore(),
))
```
