# Seller quickstart (`@coinbase/x402`)

This guide shows you how to protect HTTP routes with x402 payments using
Coinbase CDP infrastructure. The SDK automatically provisions receiver wallets,
configures the CDP facilitator, and wires in EVM and Solana payment support.

## Prerequisites

- Node.js 20+ (TypeScript), Python 3.10+ (Python), or Go 1.24+ (Go)
- A CDP API key from [portal.cdp.coinbase.com](https://portal.cdp.coinbase.com/)

TypeScript and Python auto-provision receiver wallets — no `PAY_TO` address
required. Go uses an explicit `PAY_TO` environment variable.

## TypeScript

### Install

```bash
npm install @coinbase/x402
```

### Set environment variables

```bash
export CDP_SERVER_API_KEY_ID="your-api-key-id"
export CDP_SERVER_API_KEY_SECRET="your-api-key-secret"
export CDP_SERVER_WALLET_SECRET="your-wallet-secret"
```

> Using `CDP_SERVER_*` variables avoids credential collisions in processes
> that also run buyer code (which uses `CDP_API_KEY_*` / `CDP_WALLET_SECRET`).
> See [Environment setup](./env-setup.md) for details.

### Create a CDP resource server

`createCdpResourceServer` provisions a receiver wallet, configures the CDP
facilitator, and exposes a standard HTTP server that any Node.js framework
adapter can wrap.

```typescript
import { createCdpResourceServer } from "@coinbase/x402/server";

// No PAY_TO needed — the server provisions and manages the receiver wallet.
const server = await createCdpResourceServer({
  routes: {
    "GET /report": { price: "$0.01", description: "AI-generated report" },
    "POST /generate": { price: "$0.05", description: "Image generation" },
  },
});

console.log("EVM receiver:", server.payToEvmAddress);
console.log("Solana receiver:", server.payToSvmAddress);
```

### Wire to your framework

`CdpResourceServer` extends `x402HTTPResourceServer`, so it works as a
drop-in with any x402 framework middleware:

```typescript
// Express — npm install @x402/express express
import express from "express";
import { paymentMiddlewareFromHTTPServer } from "@x402/express";
const app = express();
app.use(paymentMiddlewareFromHTTPServer(server));
app.listen(4021);

// Hono — npm install @x402/hono hono
import { Hono } from "hono";
import { paymentMiddlewareFromHTTPServer } from "@x402/hono";
const app = new Hono();
app.use(paymentMiddlewareFromHTTPServer(server));

// Next.js — npm install @x402/next
// middleware.ts (project root)
import { paymentProxyFromHTTPServer } from "@x402/next";
export default paymentProxyFromHTTPServer(server);
export const config = { matcher: ["/report", "/generate"] };
// For per-route handlers see examples/typescript/servers.
```

> **Middleware-only alternative:** `@coinbase/x402-express` and
> `@coinbase/x402-hono` each expose a `createCdpExpressMiddleware` /
> `createCdpHonoMiddleware` helper that wires directly to a `payTo` address
> without `createCdpResourceServer`. `@coinbase/x402-next` exposes
> `createCdpPaymentProxy` (the App Router proxy pattern requires a different
> name). All three skip wallet auto-provisioning and extension injection
> (Bazaar, gas sponsoring). See
> [examples/typescript/servers](../examples/typescript/servers) for
> complete examples of both approaches.

## Python

### Install

```bash
pip install "cdp-x402[server-fastapi]"   # FastAPI
# or
pip install "cdp-x402[server-flask]"     # Flask
```

### Set environment variables

```bash
export CDP_SERVER_API_KEY_ID="your-api-key-id"
export CDP_SERVER_API_KEY_SECRET="your-api-key-secret"
export CDP_SERVER_WALLET_SECRET="your-wallet-secret"
```

> Using `CDP_SERVER_*` variables avoids credential collisions in processes
> that also run buyer code (which uses `CDP_API_KEY_*` / `CDP_WALLET_SECRET`).
> See [Environment setup](./env-setup.md) for details.

### Create a CDP resource server

`create_cdp_resource_server` provisions receiver wallets, configures the CDP
facilitator, and injects EIP-2612 gas sponsoring, ERC-20 approval gas
sponsoring, and Bazaar discovery extensions automatically.

```python
from cdp_x402 import create_cdp_resource_server

# No PAY_TO needed — wallets are provisioned automatically.
server = await create_cdp_resource_server({
    "routes": {
        "GET /report": {"price": "$0.01", "description": "AI-generated report"},
        "POST /generate": {"price": "$0.05", "description": "Image generation"},
    },
})

print("EVM receiver:", server.pay_to_evm_address)
print("Solana receiver:", server.pay_to_svm_address)
```

### Wire to your framework

```python
# FastAPI — asynccontextmanager lifespan wires the middleware at startup
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from x402.http.middleware.fastapi import payment_middleware
from cdp_x402 import create_cdp_resource_server

_x402_middleware = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global _x402_middleware
    server = await create_cdp_resource_server(
        {"routes": {"GET /report": {"price": "$0.01", "description": "AI-generated report"}}}
    )
    _x402_middleware = payment_middleware(
        routes=server.routes_config,
        server=server.resource_server,
        sync_facilitator_on_start=False,
    )
    yield

app = FastAPI(lifespan=lifespan)

@app.middleware("http")
async def x402_middleware(request: Request, call_next):
    return await _x402_middleware(request, call_next)

@app.get("/report")
async def report() -> dict:
    return {"report": "..."}
```

```python
# Flask — provision wallets with asyncio.run at startup, then use sync middleware
import asyncio
from flask import Flask, jsonify
from x402.http.middleware.flask import payment_middleware
from x402.server import x402ResourceServerSync
from cdp_x402 import (
    create_cdp_facilitator_client_sync,
    create_cdp_resource_server,
    get_cdp_default_schemes,
    get_cdp_extension_registrations,
)

async def _provision():
    server = await create_cdp_resource_server(
        {"routes": {"GET /report": {"price": "$0.01", "description": "AI-generated report"}}}
    )
    return server.routes_config

_routes_config = asyncio.run(_provision())

_sync_server = x402ResourceServerSync(create_cdp_facilitator_client_sync())
for s in get_cdp_default_schemes():
    _sync_server.register(s.network, s.server)
for e in get_cdp_extension_registrations():
    _sync_server.register_extension(e)

app = Flask(__name__)
payment_middleware(app, routes=_routes_config, server=_sync_server)

@app.get("/report")
def report():
    return jsonify({"report": "..."})
```

See [examples/python/servers](../examples/python/servers) for complete FastAPI
and Flask examples.

## Go

### Install

```bash
go get github.com/coinbase/cdp-x402/go/cdpx402@latest
go get github.com/x402-foundation/x402/go@latest
```

### Setup

```go
import (
    "encoding/json"
    "log"
    "net/http"
    "os"

    "github.com/coinbase/cdp-x402/go/cdpx402"
)

func main() {
    payTo := os.Getenv("PAY_TO") // EVM address that receives payments
    if payTo == "" {
        log.Fatal("PAY_TO env var required")
    }

    // Reads CDP_SERVER_API_KEY_ID / CDP_SERVER_API_KEY_SECRET from env.
    facilitator, err := cdpx402.CreateCdpFacilitatorClient("", "")
    if err != nil {
        log.Fatal(err)
    }

    // Wrap each handler with x402 verify-then-settle logic.
    // See examples/go/servers/http/main.go for the full paymentHandler helper.
    http.HandleFunc("/report", paymentHandler(facilitator, payTo,
        func(w http.ResponseWriter, r *http.Request) {
            json.NewEncoder(w).Encode(map[string]string{"report": "..."})
        },
    ))
    log.Fatal(http.ListenAndServe(":4021", nil))
}
```

See [examples/go/servers/http](../examples/go/servers/http) for a complete
example.

## Route configuration

The route config format controls which networks and payment amounts are accepted
for each protected endpoint. See [Route config format](./route-config.md) for
the full reference, including the simplified CDP format and the full x402
format.

## Next steps

- [Route config format](./route-config.md) — simplified CDP format and full x402 format
- [Environment setup](./env-setup.md) — full env var reference
- [SDK support](./sdk-support.md) — feature comparison across TypeScript, Python, and Go
