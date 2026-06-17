"""
FastAPI resource server protected with x402 and the CDP facilitator.

Uses `create_cdp_resource_server()` to provision a CDP receiver wallet
automatically — no PAY_TO environment variable required. The returned
`CDPResourceServer` exposes `pay_to_evm_address`, `pay_to_svm_address`,
`resource_server` (the CDP-wired async x402 server), and `routes_config`
(the fully-resolved route map with pay_to and CDP extensions injected).

Requires environment variables:
  CDP_SERVER_API_KEY_ID, CDP_SERVER_API_KEY_SECRET, CDP_SERVER_WALLET_SECRET

Run:
  pip install "cdp-sdk[x402-fastapi]"
  uvicorn server:app
"""

from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI, Request
from x402.http.middleware.fastapi import payment_middleware

from cdp.x402 import create_cdp_resource_server

load_dotenv()

_x402_middleware = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _x402_middleware

    server = await create_cdp_resource_server(
        {
            "routes": {
                "GET /report": {
                    "price": "$0.01",
                    "description": "AI-generated report",
                    # Defaults to Base mainnet + Solana mainnet when omitted.
                    # Uncomment to restrict to specific networks:
                    # "networks": ["eip155:8453"],
                },
            },
        }
    )

    print(
        f"Listening on http://localhost:8000\n"
        f"Receiving EVM payments at {server.pay_to_evm_address}\n"
        f"Receiving Solana payments at {server.pay_to_svm_address}"
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
async def report() -> dict[str, str]:
    return {"report": "..."}
