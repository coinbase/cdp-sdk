# Buyer quickstart

This guide shows you how to make x402-protected HTTP requests using a Coinbase
CDP wallet. When a server returns a `402 Payment Required` response, the SDK
handles the entire payment flow automatically — selecting the best payment
option, signing the transaction, and retrying the request with the payment
header attached.

## Prerequisites

- A CDP API key from [portal.cdp.coinbase.com](https://portal.cdp.coinbase.com/)
- A funded wallet on your target network (e.g. USDC on Base for production,
  or USDC on Base Sepolia for testing)
- Node.js 20+ (TypeScript) or Python 3.10+ (Python)

## TypeScript

### 1. Install

```bash
npm install @coinbase/x402
```

### 2. Set environment variables

```bash
export CDP_API_KEY_ID="your-api-key-id"
export CDP_API_KEY_SECRET="your-api-key-secret"
export CDP_WALLET_SECRET="your-wallet-secret"
```

See [Environment setup](./env-setup.md) for all available variables.

### 3. Make a paid request

#### Simplest path — EOA (Server Wallet)

```typescript
import { CdpX402Client } from "@coinbase/x402";

// Reads all config from env vars. Initializes lazily on the first payment.
const client = new CdpX402Client();
const fetchWithPayment = client.wrapFetch();

const response = await fetchWithPayment(
  "https://api.example.com/paid-endpoint",
);
const data = await response.json();
console.log(data);
```

`CdpX402Client` defaults to a CDP Server Wallet (EOA). No async setup is
required at startup — the wallet provisions itself on the first payment.
`wrapFetch()` returns a settlement-aware fetch that correctly confirms or rolls
back spend cap entries based on whether the server confirms on-chain settlement.

#### Smart Contract Wallet (SCW)

A Smart Contract Wallet uses an ERC-4337 paymaster to cover gas fees, so you
don't need to hold ETH for gas.

```typescript
import { CdpX402Client } from "@coinbase/x402";

const client = new CdpX402Client({
  walletConfig: {
    type: "cdp-smart",
    ownerAccountName: "my-owner-wallet", // EOA that signs for the SCW
    accountName: "my-smart-wallet", // optional, defaults to "x402-server-wallet-1"
  },
});
const fetchWithPayment = client.wrapFetch();
```

#### Eager initialization

Use `createCdpX402Client` when you need to know the wallet address before
making the first request (e.g. to top it up, display it in a UI, or pass it
to another system):

```typescript
import { createCdpX402Client, wrapFetchWithPayment } from "@coinbase/x402";

const { client, evmAddress, svmAddress } = await createCdpX402Client();
console.log("Paying from EVM address:", evmAddress);
console.log("Paying from Solana address:", svmAddress);

const fetchWithPayment = wrapFetchWithPayment(fetch, client);
const response = await fetchWithPayment(
  "https://api.example.com/paid-endpoint",
);
```

### 4. Handle payment errors

Errors thrown during payment (insufficient funds, blocked by spend controls,
etc.) propagate as standard JavaScript exceptions. Wrap the call or use
`.catch()`:

```typescript
import { SpendControlError } from "@coinbase/x402";

try {
  const response = await fetchWithPayment(
    "https://api.example.com/paid-endpoint",
  );
} catch (err) {
  if (err instanceof SpendControlError) {
    console.error("Payment blocked:", err.code, err.details);
  } else {
    throw err;
  }
}
```

### 5. Add spend controls (optional)

Spend controls let you set per-payment caps, rolling cumulative caps, and
network / asset / payee allow-lists. Pass `spendControls` to the client config:

```typescript
import { CdpX402Client } from "@coinbase/x402";

// Always use the contract address — "usdc" and "0x036cbd…" are different identifiers.
const USDC_BASE_SEPOLIA = "0x036cbd53842c5426634e7929541ec2318f3dcf7e";

const client = new CdpX402Client({
  spendControls: {
    maxAmountPerPayment: { atomic: 2_000_000n, asset: USDC_BASE_SEPOLIA }, // 2 USDC
    maxCumulativeSpend: { atomic: 10_000_000n, asset: USDC_BASE_SEPOLIA }, // 10 USDC
    maxCumulativeSpendWindow: "24h",
    allowedNetworks: ["eip155:84532"], // Base Sepolia only
    allowedAssets: [USDC_BASE_SEPOLIA],
    onApproachingLimit: (spent, limit) =>
      console.warn(`Approaching cap: ${spent.atomic}/${limit.atomic}`),
  },
});
```

See [Spend controls (guardrails)](./client-guardrails.md) for the full reference.

### 6. Discover paid APIs (Bazaar)

The CDP Bazaar is a discovery index for x402-gated resources. It requires no
API key credentials:

```typescript
import { createCdpBazaarClient } from "@coinbase/x402";

const bazaar = createCdpBazaarClient();

// Browse all resources
const { items } = await bazaar.listResources({ limit: 20 });

// Search by natural-language query
const results = await bazaar.searchResources({
  query: "weather forecast APIs",
  maxUsdPrice: "0.05",
  network: "eip155:8453",
});

console.log(results.resources.map((r) => r.resource));
```

## Python

### 1. Install

```bash
pip install cdp-x402 x402
```

### 2. Set environment variables

```bash
export CDP_API_KEY_ID="your-api-key-id"
export CDP_API_KEY_SECRET="your-api-key-secret"
export CDP_WALLET_SECRET="your-wallet-secret"
```

### 3. Make a paid request

#### Simplest path — EOA (Server Wallet)

```python
from cdp_x402 import CdpX402Client

# Reads all config from env vars. Initializes lazily on the first payment.
client = CdpX402Client()
async with client.async_client() as http:
    response = await http.get("https://api.example.com/paid-endpoint")
    data = response.json()
```

`async_client()` returns a settlement-aware `httpx.AsyncClient` that correctly
confirms or rolls back spend cap entries based on the server's settlement
response.

#### Smart Contract Wallet (SCW)

```python
from cdp_x402 import CdpX402ClientConfig, WalletConfig, create_cdp_x402_client

result = await create_cdp_x402_client(
    CdpX402ClientConfig(
        wallet_config=WalletConfig(type="cdp-smart", owner_account_name="my-owner")
    )
)
async with result.async_client() as http:
    response = await http.get("https://api.example.com/paid-endpoint")
```

#### Eager initialization

Use `create_cdp_x402_client` when you need the wallet address before making the
first request (e.g. to fund the wallet or display the address):

```python
from cdp_x402 import create_cdp_x402_client

result = await create_cdp_x402_client()
print(f"Paying from: {result.evm_address}")

async with result.async_client() as http:
    response = await http.get("https://api.example.com/paid-endpoint")
```

### 4. Add spend controls (optional)

Spend controls let you set per-payment caps, rolling cumulative caps, and
network / asset / payee allow-lists. Pass `spend_controls` to the client config:

```python
from cdp_x402 import Amount, CdpX402Client, CdpX402ClientConfig, SpendControls

USDC_BASE_SEPOLIA = "0x036cbd53842c5426634e7929541ec2318f3dcf7e"

client = CdpX402Client(
    CdpX402ClientConfig(
        spend_controls=SpendControls(
            max_amount_per_payment=Amount(atomic=2_000_000, asset=USDC_BASE_SEPOLIA),  # 2 USDC
            max_cumulative_spend=Amount(atomic=10_000_000, asset=USDC_BASE_SEPOLIA),   # 10 USDC
            max_cumulative_spend_window="24h",
            allowed_networks=["eip155:84532"],  # Base Sepolia only
            allowed_assets=[USDC_BASE_SEPOLIA],
        )
    )
)
```

### 5. Discover paid APIs (Bazaar)

```python
from cdp_x402 import (
    ListDiscoveryResourcesParams,
    SearchDiscoveryResourcesParams,
    create_cdp_bazaar_client,
)

async with create_cdp_bazaar_client() as bazaar:
    # Browse all resources
    result = await bazaar.list_resources_async(ListDiscoveryResourcesParams(limit=20))

    # Search by natural-language query
    results = await bazaar.search_resources_async(
        SearchDiscoveryResourcesParams(
            query="weather forecast APIs",
            max_usd_price="0.05",
            network="eip155:8453",
        )
    )
```

See [examples/python/clients](../examples/python/clients) for complete examples.

## Next steps

- [Environment setup](./env-setup.md) — full env var reference
- [Spend controls](./client-guardrails.md) — per-payment caps, rolling windows, allow-lists
- [SDK support](./sdk-support.md) — feature comparison across TypeScript, Python, and Go
