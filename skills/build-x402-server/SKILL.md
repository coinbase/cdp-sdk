---
name: build-x402-server
description: |
  Write code that charges for an HTTP route with the x402 protocol and receives USDC in a
  CDP-managed wallet. Covers TypeScript (Express, Hono, Next.js) and Python (FastAPI, Flask). Use
  when the user wants to monetize an API, price a route per request, put a paywall in front of an
  endpoint, accept payments from agents, or add x402 to a server they already run.
compatibility: Requires a CDP API key and wallet secret. Node.js >= 22 (TypeScript) or Python >= 3.10.
metadata:
  author: developer-platform@coinbase.com
  version: "0.1.0"
---

# Build an x402 server

Take the user from an unprotected HTTP route to one that answers `402 Payment Required` and settles
a real payment into a CDP-managed wallet.

Resolve the Decisions table below before writing any code, then read only the language and
framework subsections you resolved to in step 3.

## When not to use this skill

- **The user sells through Coinbase Business.** The
  [Business Checkouts API](https://docs.cdp.coinbase.com/coinbase-business/checkout-apis/accept-x402-payments)
  returns one checkout with a hosted payment URL for people and a payable `x402_url` for agents,
  and they run no server at all. Check for this early: for that user it is a genuinely better
  answer than anything below.
- **The user is charging for an MCP tool rather than an HTTP route.** See
  [Charge over MCP](https://docs.cdp.coinbase.com/x402/seller/mcp-payments).
- **The user is the one paying.** Use the `build-x402-client` skill.
- **The user wants a deployed money-making service with no code.** Use the agentic-wallet
  [monetize-service](https://docs.cdp.coinbase.com/agentic-wallet/cli/skills/monetize-service)
  skill. It is the nearest neighbour to this skill and the most likely mis-selection.

## Decisions

Resolve every row before writing code. Detect first; only ask when detection is ambiguous.

| Decision            | How to detect                                                                     | Ask only if                 | Default                         |
| ------------------- | ----------------------------------------------------------------------------------- | --------------------------- | ------------------------------- |
| Language            | `package.json` -> TypeScript. `pyproject.toml` / `requirements.txt` -> Python.    | Both present, or neither    | Ask                             |
| Framework           | Read deps for `express`, `hono`, `next`, `fastapi`, `flask`.                      | No server framework present | Ask; suggest Express or FastAPI |
| Wiring approach     | An existing `x402ResourceServer` or `paymentMiddleware` call -> facilitator swap. | —                           | Greenfield                      |
| Route config source | An `x402.config.json` already in the project -> config file.                      | —                           | Inline in code                  |
| Receiver wallet     | The user supplied a `payTo` address -> use it.                                    | —                           | CDP-provisioned wallet          |
| Network             | `environment: "development"` selects testnets.                                    | Never assume mainnet        | `development`                   |
| Scheme              | Fixed price -> `exact`. Metered or usage-based -> `upto`.                         | —                           | `exact`                         |

Two hard rules, not preferences:

1. **Never move a server to mainnet unless the user asks in the current turn.** That puts real
   payers in front of a route that may not be ready.
2. **If the user supplies a `payTo` address, echo it back for confirmation before writing it.** A
   typo'd receiver sends every future payment somewhere unrecoverable.

## Steps

### 1. Confirm credentials

Before installing anything, check the environment for `CDP_API_KEY_ID`, `CDP_API_KEY_SECRET`, and
`CDP_WALLET_SECRET`. The API key authenticates the server to the CDP Facilitator; the wallet secret
provisions the wallet that receives payments, and is only needed when the user has not supplied a
`payTo` of their own. Send them to
[API key authentication](https://docs.cdp.coinbase.com/wallets/quickstart/api-key-auth) if they have
no key. Also confirm the runtime: Node.js 22 or later, or Python 3.10 or later.

### 2. Install

Pick the line matching the Decisions table. The `@x402/*` packages are optional peer dependencies of
the CDP SDK, so they are not installed for you, and `@x402/svm` and `@x402/extensions` are required
even for an EVM-only server because `@coinbase/cdp-sdk/x402` imports them at module load.

```bash
# TypeScript, Express (Hono and Next.js: @x402/hono or @x402/next in place of @x402/express)
npm install express @coinbase/cdp-sdk @x402/core @x402/evm @x402/svm @x402/extensions @x402/express

# Python
pip install "cdp-sdk" "x402[evm,svm,fastapi]" uvicorn   # FastAPI
pip install "cdp-sdk" "x402[evm,svm,flask]"             # Flask
```

### 3. Price the route

Three things are needed from the user before writing anything. Ask for whichever cannot be inferred:
**which routes to charge for**, **the price per call**, and **a one-line description of what each
route returns**. The description is not decoration — it is what buyers see when the service is
listed for discovery, so a vague one costs the user customers later.

State the containment rule plainly: only routes named in the config are protected, everything else
stays free. That is the sentence that stops someone paywalling `/health`.

Read only the subsections matching the language and framework resolved above.

#### TypeScript

`createX402Server` provisions the receiver wallet, wires the CDP Facilitator, registers the schemes
and extensions, and returns an object any x402 framework adapter accepts. It is async — `await` it
before `app.use`.

```typescript
import { createX402Server } from "@coinbase/cdp-sdk/x402";
import { paymentMiddlewareFromHTTPServer } from "@x402/express";
import express from "express";

const app = express();

const server = await createX402Server({
  environment: "development", // testnets and test funds
  routes: {
    "GET /report": { price: "$0.01", description: "Generate a concise research report" },
  },
});

app.use(paymentMiddlewareFromHTTPServer(server));
app.get("/report", (_req, res) => res.json({ report: "..." }));

app.listen(8402, () => console.log(`Receiving payments at ${server.payToEvmAddress}`));
```

Two variants on that shape:

- **The user already runs x402.** Do not rewrite their server. Replace the facilitator argument
  with `createCdpFacilitatorClient()` from `@coinbase/cdp-sdk/x402` — same return type, so nothing
  else in their code moves. This path needs a `payTo` address, and the factory is synchronous.
- **Routes belong in a file.** Pass `configPath: "./x402.config.json"` instead of `routes`. Inline
  routes win per key when both are given, which is how you keep a shared file and still special-case
  one route in code. Keep credentials in environment variables, not the file.

**Hono** is the Express code with `@x402/hono` in place of `@x402/express` and `serve({ fetch:
app.fetch, port })` in place of `app.listen`. The server object is identical.

**Next.js** is the one genuine exception. App Router route files re-evaluate, so build the server
once in its own module and import it from the handler:

```typescript
// app/x402.ts
export const server = new x402ResourceServer(createCdpFacilitatorClient()).register(
  "eip155:84532",
  new ExactEvmScheme(),
);

// app/api/report/route.ts
export const GET = withX402(handler, { accepts: [...], description: "..." }, server);
```

Gotchas worth stating once:

- Register the middleware before the protected handlers.
- Omitting `environment` means mainnet.
- Under `"development"`, routes default to both Base Sepolia and Solana Devnet.

**Usage-based pricing (`upto`)** only when the user asks for it. The route takes `scheme: "upto"`
and a price that acts as a ceiling; the handler calls `setSettlementOverrides(res, { amount })`
with the amount actually used before sending the body. That amount is a string of atomic units, so
`"100000"` is $0.10 in 6-decimal USDC. `upto` is EVM-only, so under `"development"` it resolves to
Base Sepolia alone.

#### Python

There is no `createX402Server` in Python, so assemble the pieces by hand. It is two halves, and
naming them is what keeps the Python version from reading as long and arbitrary:

1. A CDP wallet to receive payments, resolved from `cdp.evm.get_or_create_account(...).address`.
2. The x402 Foundation middleware, pointed at the CDP Facilitator with `create_facilitator_config()`.

```python
from cdp.x402 import create_facilitator_config
from fastapi import FastAPI
from x402.http import HTTPFacilitatorClient, PaymentOption
from x402.http.middleware.fastapi import PaymentMiddlewareASGI
from x402.http.types import RouteConfig
from x402.mechanisms.evm.exact import ExactEvmServerScheme
from x402.server import x402ResourceServer

NETWORK = "eip155:84532"  # Base Sepolia

server = x402ResourceServer(HTTPFacilitatorClient(create_facilitator_config()))
server.register(NETWORK, ExactEvmServerScheme())

routes = {
    "GET /report": RouteConfig(
        accepts=[PaymentOption(scheme="exact", pay_to=PAY_TO, price="$0.01", network=NETWORK)],
        mime_type="application/json",
        description="AI-generated report",
    ),
}

app = FastAPI()
app.add_middleware(PaymentMiddlewareASGI, routes=routes, server=server)
```

Run it with `uvicorn.run(app, port=8402)`.

The sharpest edge is resolving `PAY_TO`. `CdpClient` is an async context manager, but the route
config above is module-level and synchronous, which is why the examples resolve the receiver once
at import time with `asyncio.run(resolve_pay_to())`. That works when the module is the entry point.
Under an ASGI server that imports it from inside a running event loop, it raises `RuntimeError`, and
the user needs a lifespan hook instead.

**Flask** is the same code with three substitutions: `x402ResourceServerSync` and
`HTTPFacilitatorClientSync` in place of the async pair, and `payment_middleware(app, routes=routes,
server=server)` from `x402.http.middleware.flask`, which is a function that mutates the app rather
than a middleware class. Handing Flask the async `x402ResourceServer` raises a `TypeError`.

Two more gotchas: a `PaymentOption` needs `pay_to`, `price`, `scheme`, and `network` together, and
a missing one fails at request time rather than at startup; and this path is EVM-only, with no
Solana option.

### 4. Confirm the route is protected

Start the server, then from a second terminal:

```bash
curl -i http://localhost:8402/report
```

```console
HTTP/1.1 402 Payment Required
PAYMENT-REQUIRED: eyJ4NDAyVmVyc2lvbiI6MiwiZXJyb3IiOiJQYXltZW50IHJlcXVpcmVkIiwi...
```

This is the cheap checkpoint before any money moves, and it needs no buyer. Do not skip to step 5.

### 5. Take a real payment

Either testing path works:

- Point the agentic-wallet
  [pay-for-service](https://docs.cdp.coinbase.com/agentic-wallet/cli/skills/pay-for-service) skill
  at `http://localhost:8402/report`.
- Build a buyer with the `build-x402-client` skill and point it at the same URL.

Success is `HTTP 200` on the buyer side. The buyer wallet needs testnet USDC first, which is step 4
of the client skill — link it rather than re-teaching funding here.

## Troubleshooting

| Symptom                                | Cause                                                                    | Fix                                                          |
| -------------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------ |
| Route returns `200` with no payment    | Route key does not match the real method and path, or middleware was registered after the handler | Compare the key to the handler; move `app.use` above it      |
| `402` with no `PAYMENT-REQUIRED` header | The middleware was never reached                                        | Check registration order and the mount path                  |
| Verification passes, settlement fails  | Buyer and server are on different chains                                | Match the buyer's network to the one in the `402`            |
| Auth error at startup                  | `CDP_API_KEY_*` not visible to the process                              | Check how the process loads its environment, not just `.env` |
| Payments land somewhere unknown        | A CDP wallet was provisioned and the printed `payTo` was never recorded | Read it back from `server.payToEvmAddress` and save it       |

## Runnable examples

TypeScript, under `https://github.com/coinbase/cdp-sdk/blob/main/examples/typescript/x402/servers/`:
`express/server.ts` (all three approaches), `express/x402.config.json` and
`express/x402.config.schema.json`, `hono/server.ts`, `next/app/api/report/route.ts`,
`bazaar/server.ts`, `mcp/server.ts`.

Python, under `https://github.com/coinbase/cdp-sdk/blob/main/examples/python/x402/servers/`:
`fastapi/server.py`, `flask/server.py`, `bazaar.py`, `mcp/server.py`.

## After the first payment

- Make the endpoint findable: [Get discovered](https://docs.cdp.coinbase.com/x402/seller/get-discovered), plus the Bazaar examples above
- What settled the payment: [CDP Facilitator](https://docs.cdp.coinbase.com/x402/seller/facilitator)
- Other networks, schemes, receivers, lifecycle hooks: [Production configuration](https://docs.cdp.coinbase.com/x402/seller/production-configuration)
- Charging for MCP tools: [Charge over MCP](https://docs.cdp.coinbase.com/x402/seller/mcp-payments)
- Mainnet: drop `environment: "development"` and confirm with the user first
