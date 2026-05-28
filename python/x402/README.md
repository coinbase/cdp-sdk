# cdp-x402 (Python)

Coinbase CDP-opinionated wrapper for the [x402](https://x402.org) payment protocol.

Provides a payment client (for making paid HTTP requests with a CDP wallet), a
resource server factory (for protecting routes with x402 payments), and a
pre-configured facilitator client (for authenticating with the CDP hosted x402 facilitator).

## Installation

```bash
pip install cdp-x402
```

For framework middleware, install the matching extra:

```bash
pip install "cdp-x402[server-fastapi]"   # FastAPI middleware
pip install "cdp-x402[server-flask]"     # Flask middleware
```

## Payment client (buyer / client-side)

Use `CdpX402Client` to make requests to x402-protected endpoints. It initializes lazily on
the first payment, reading all configuration from environment variables by default.

```python
from cdp_x402 import CdpX402Client

client = CdpX402Client()
async with client.async_client() as http:
    response = await http.get("https://api.example.com/paid-endpoint")
```

`async_client()` returns a settlement-aware `httpx.AsyncClient` — it confirms
or rolls back spend records based on the server's settlement response.

For explicit control or when you need the wallet address before making payments
(e.g. to fund the wallet first), use `create_cdp_x402_client`:

```python
from cdp_x402 import create_cdp_x402_client

result = await create_cdp_x402_client()
print(f"Paying from {result.evm_address}")

async with result.async_client() as http:
    response = await http.get("https://api.example.com/paid-endpoint")
```

### Smart Contract Wallet

```python
from cdp_x402 import CdpX402ClientConfig, WalletConfig, create_cdp_x402_client

result = await create_cdp_x402_client(
    CdpX402ClientConfig(
        wallet_config=WalletConfig(type="cdp-smart", owner_account_name="my-owner")
    )
)
print(f"Smart wallet: {result.evm_address}")
print(f"Owner EOA:    {result.owner_wallet}")
```

## Resource server (seller / server-side)

Use `create_cdp_resource_server` to protect HTTP routes with x402 payments. It
auto-provisions EVM and Solana receiver wallets, wires in the CDP facilitator,
and injects EIP-2612 gas sponsoring, ERC-20 approval gas sponsoring, and
Bazaar discovery extensions on every route.

```python
from cdp_x402 import create_cdp_resource_server

# Reads CDP_SERVER_API_KEY_ID, CDP_SERVER_API_KEY_SECRET, CDP_SERVER_WALLET_SECRET
# from env. No PAY_TO needed — wallets are provisioned automatically.
server = await create_cdp_resource_server({
    "routes": {
        "GET /report": {"price": "$0.01", "description": "AI-generated report"},
        "POST /generate": {"price": "$0.05", "description": "Image generation"},
    },
})

print(f"EVM receiver:    {server.pay_to_evm_address}")
print(f"Solana receiver: {server.pay_to_svm_address}")
```

Pass the resolved config to your framework middleware:

```python
# FastAPI — build the middleware once at startup, then call it per-request
from x402.http.middleware.fastapi import payment_middleware

_x402 = payment_middleware(
    routes=server.routes_config,
    server=server.resource_server,
    sync_facilitator_on_start=False,
)

@app.middleware("http")
async def x402_middleware(request, call_next):
    return await _x402(request, call_next)
```

```python
# Flask — provision the server synchronously at startup
import asyncio
from flask import Flask
from x402.http.middleware.flask import payment_middleware
from x402.server import x402ResourceServerSync
from cdp_x402 import (
    create_cdp_facilitator_client_sync,
    create_cdp_resource_server,
    get_cdp_default_schemes,
    get_cdp_extension_registrations,
)

result = asyncio.run(create_cdp_resource_server({"routes": {"GET /report": {"price": "$0.01"}}}))
_sync_server = x402ResourceServerSync(create_cdp_facilitator_client_sync())
for s in get_cdp_default_schemes():
    _sync_server.register(s.network, s.server)
for e in get_cdp_extension_registrations():
    _sync_server.register_extension(e)

app = Flask(__name__)
payment_middleware(app, routes=result.routes_config, server=_sync_server)
```

### Smart Contract Wallet (server-side)

```python
from cdp_x402 import CdpResourceServerConfig, WalletConfig, create_cdp_resource_server

server = await create_cdp_resource_server(
    CdpResourceServerConfig(
        routes={"GET /report": {"price": "$0.01"}},
        wallet_config=WalletConfig(type="cdp-smart", owner_account_name="my-owner"),
    )
)
print(f"SCW receiver: {server.pay_to_evm_address}")
print(f"Owner EOA:    {server.owner_wallet}")
```

## Facilitator client (lower-level)

Use `create_cdp_facilitator_client` directly when you need more control over the
resource server setup (e.g. to supply your own `payTo` addresses).

```python
from cdp_x402 import create_cdp_facilitator_client
from x402.server import x402ResourceServer
from x402.mechanisms.evm.exact import ExactEvmServerScheme

# Reads CDP_SERVER_API_KEY_ID / CDP_SERVER_API_KEY_SECRET from environment
facilitator = create_cdp_facilitator_client()

server = x402ResourceServer(facilitator)
server.register("eip155:8453", ExactEvmServerScheme())
server.register("eip155:84532", ExactEvmServerScheme())
server.initialize()
```

### Explicit credentials

```python
facilitator = create_cdp_facilitator_client(
    api_key_id="my-key-id",
    api_key_secret="my-key-secret",
)
```

### Sync variant (for Flask / requests)

```python
from cdp_x402 import create_cdp_facilitator_client_sync

facilitator = create_cdp_facilitator_client_sync()
```

## CDP Resource Server

`CdpResourceServer` packages a CDP-provisioned receiver wallet, the CDP
facilitator, the CDP gas-sponsoring extensions, and Bazaar discovery metadata
into a single resource server. Use it when you want a batteries-included server
without manually wiring schemes, extensions, or wallet provisioning.

```python
from cdp_x402 import create_cdp_resource_server, CdpRouteConfig

server = await create_cdp_resource_server(
    {
        "routes": {
            "GET /premium": CdpRouteConfig(price="$0.01"),
            "POST /llm/completions": CdpRouteConfig(
                price="$0.05",
                networks=["eip155:8453", "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp"],
            ),
        },
    }
)

print("Pay-to EVM:", server.pay_to_evm_address)
print("Pay-to SVM:", server.pay_to_svm_address)
```

A simplified `CdpRouteConfig` is expanded across the configured networks; full
x402 route dicts (with an `accepts` key) are also accepted.

## Web framework middleware

The framework middleware wraps the core CDP facilitator with per-route payment
gates that emit the x402 V2 wire format (`PAYMENT-REQUIRED` request advert,
`PAYMENT-SIGNATURE` payment header, `PAYMENT-RESPONSE` settlement header).

### Flask

```python
from flask import Flask, jsonify
from x402.mechanisms.evm.exact import ExactEvmServerScheme
from cdp_x402.middleware.flask import CDPx402Flask

x402 = CDPx402Flask()
x402.register_scheme("eip155:8453", ExactEvmServerScheme())

app = Flask(__name__)
x402.init_app(app)

@app.get("/report")
@x402.payment_required(price="$0.01", network="eip155:8453", pay_to=PAY_TO)
def report():
    return jsonify({"report": "..."})
```

Flask is sync; the middleware uses `x402ResourceServerSync` so requests never
touch an event loop.

### FastAPI

```python
from fastapi import FastAPI, Request, Response
from x402.mechanisms.evm.exact import ExactEvmServerScheme
from cdp_x402.middleware.fastapi import CDPx402FastAPI

x402 = CDPx402FastAPI()
x402.register_scheme("eip155:8453", ExactEvmServerScheme())

app = FastAPI()
x402.init_app(app)

@app.get("/report")
@x402.payment_required(price="$0.01", network="eip155:8453", pay_to=PAY_TO)
async def report(request: Request, response: Response) -> dict:
    return {"report": "..."}
```

The decorator runs verify → handler → settle inline. Include a `Response`
parameter in decorated routes so settlement headers can be attached without
bypassing FastAPI's route-level response handling (`response_model`,
custom status codes, etc.). For verification only
(e.g. when you want to settle yourself), use the `Depends`-based variant:

```python
from fastapi import Depends
from cdp_x402.middleware._common import VerifiedPayment

dep = x402.dependency(price="$0.01", network="eip155:8453", pay_to=PAY_TO)

@app.get("/report")
async def report(payment: VerifiedPayment = Depends(dep)) -> dict:
    return {"payer": payment.payload.payload}
```

If you prefer the upstream middleware / routes-config style instead of
decorators, both modules also expose a `payment_middleware(...)` that pre-wires
the CDP facilitator client.

## Environment variables

### Buyer (client-side)

| Variable                 | Required for         | Description                                           |
| ------------------------ | -------------------- | ----------------------------------------------------- |
| `CDP_API_KEY_ID`         | Client + facilitator | CDP API key ID                                        |
| `CDP_API_KEY_SECRET`     | Client + facilitator | CDP API key secret                                    |
| `CDP_WALLET_SECRET`      | Client only          | CDP wallet secret for signing operations              |
| `CDP_WALLET_TYPE`        | Client only          | Wallet backend: `cdp-eoa` (default) or `cdp-smart`    |
| `CDP_ACCOUNT_NAME`       | Client only          | Named CDP account (default: `"x402-server-wallet-1"`) |
| `CDP_OWNER_ACCOUNT_NAME` | Client (`cdp-smart`) | Owner EOA name for Smart Contract Wallets             |

### Seller (server-side)

| Variable                        | Required for                  | Description                                                        |
| ------------------------------- | ----------------------------- | ------------------------------------------------------------------ |
| `CDP_SERVER_API_KEY_ID`         | All seller usage              | CDP API key ID for the seller                                      |
| `CDP_SERVER_API_KEY_SECRET`     | All seller usage              | CDP API key secret for the seller                                  |
| `CDP_SERVER_WALLET_SECRET`      | `create_cdp_resource_server`  | Wallet secret for receiver wallet provisioning                     |
| `CDP_SERVER_WALLET_TYPE`        | Resource server               | Wallet backend: `cdp-eoa` (default) or `cdp-smart`                 |
| `CDP_SERVER_ACCOUNT_NAME`       | Resource server               | Receiver wallet account name (default: `"x402-receiver-wallet-1"`) |
| `CDP_SERVER_OWNER_ACCOUNT_NAME` | Resource server (`cdp-smart`) | Owner EOA name for Smart Contract Wallets                          |

## Documentation

- [Buyer quickstart](./docs/quickstart-buyers.md) — make x402-protected HTTP requests with a CDP wallet
- [Seller quickstart](./docs/quickstart-sellers.md) — protect HTTP routes with x402 payments
- [Environment setup](./docs/env-setup.md) — full env var reference
- [Route config format](./docs/route-config.md) — simplified CDP format and full x402 format
- [Spend controls](./docs/client-guardrails.md) — per-payment caps, rolling windows, allow-lists
- [SDK support matrix](./docs/sdk-support.md) — feature comparison across TypeScript, Python, and Go

## Development and testing

Install dev dependencies first:

```bash
cd python/x402
uv sync --extra dev
```

Run tests through `uv` so pytest uses the managed Python environment and installed extras.
Do not run plain `pytest` from your shell; it may use the wrong interpreter or miss dependencies.

```bash
# From the python/x402/ directory
uv run pytest -q

# Run a specific test file
uv run pytest tests/core/test_facilitator.py

# Run only unit tests
make test

# Run e2e tests (requires CDP credentials)
make e2e
```

## License

Apache-2.0
