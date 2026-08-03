# Usage: uv run python x402/servers/fastapi/server.py

"""FastAPI resource server protected by x402, powered by the CDP SDK.

The standard x402 Foundation server stack with two CDP swaps:

1. ``create_facilitator_config()`` points verify and settle at the CDP hosted
   facilitator, so there is no facilitator infrastructure of your own to run.
2. ``CdpClient`` provisions the receiver wallet, so there is no private key to
   store. Set PAY_TO to receive at an address you already control instead.

Python's CDP SDK has no ``createX402Server`` (unlike TypeScript), so the route
is declared in the Foundation ``RouteConfig`` format.

Setup: set CDP_API_KEY_ID, CDP_API_KEY_SECRET and CDP_WALLET_SECRET in
examples/python/.env. CDP_WALLET_SECRET is only needed when PAY_TO is unset.

Run: uv run python x402/servers/fastapi/server.py   # http://localhost:8402
"""

import asyncio
import os

from cdp import CdpClient
from cdp.x402 import create_facilitator_config
from dotenv import load_dotenv
from fastapi import FastAPI
from x402.http import HTTPFacilitatorClient, PaymentOption
from x402.http.middleware.fastapi import PaymentMiddlewareASGI
from x402.http.types import RouteConfig
from x402.mechanisms.evm.exact import ExactEvmServerScheme
from x402.schemas import Network
from x402.server import x402ResourceServer

load_dotenv()

PORT = int(os.getenv("PORT", "8402"))
NETWORK: Network = "eip155:84532"  # Base Sepolia


async def resolve_pay_to() -> str:
    """Return PAY_TO, else the address of a CDP-managed Server Wallet."""
    pay_to = os.getenv("PAY_TO")
    if pay_to:
        return pay_to
    async with CdpClient() as cdp:
        account = await cdp.evm.get_or_create_account(name="x402-receiver-wallet-1")
        return account.address


# Only the CDP wallet lookup is async, so it runs once up front and the route
# config below stays declarative. Under an ASGI server that imports this module
# from inside a running event loop, resolve PAY_TO in a lifespan hook instead.
PAY_TO = asyncio.run(resolve_pay_to())

# CDP swap: create_facilitator_config() reads CDP_API_KEY_ID / CDP_API_KEY_SECRET
# and authenticates verify/settle against the CDP hosted facilitator.
server = x402ResourceServer(HTTPFacilitatorClient(create_facilitator_config()))
server.register(NETWORK, ExactEvmServerScheme())

routes = {
    "GET /report": RouteConfig(
        accepts=[
            PaymentOption(scheme="exact", pay_to=PAY_TO, price="$0.01", network=NETWORK)
        ],
        mime_type="application/json",
        description="AI-generated report",
    ),
}

app = FastAPI()
app.add_middleware(PaymentMiddlewareASGI, routes=routes, server=server)


@app.get("/report")
async def get_report() -> dict:
    return {"report": "..."}


if __name__ == "__main__":
    import uvicorn

    print(f"Receiving EVM payments at {PAY_TO}")
    uvicorn.run(app, host="0.0.0.0", port=PORT)
