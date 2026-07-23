# Usage: uv run python x402/servers/bazaar.py

"""Bazaar-discoverable x402 server, powered by the CDP SDK.

The standard x402 Foundation server stack with one CDP swap: the facilitator is
``HTTPFacilitatorClient(create_facilitator_config())`` -- the CDP hosted
facilitator. Settling through it is what indexes a route in the CDP Bazaar.

Python's CDP SDK has no ``createX402Server`` (unlike TypeScript), so discovery
metadata is declared with the Foundation ``declare_discovery_extension`` helper.

Setup: set CDP_API_KEY_ID and CDP_API_KEY_SECRET (facilitator auth) plus
EVM_ADDRESS and SVM_ADDRESS (payment receivers) in examples/python/.env.

Run: uv run python x402/servers/bazaar.py   # http://localhost:4021
"""

import os

from cdp.x402 import create_facilitator_config
from dotenv import load_dotenv
from fastapi import FastAPI
from x402.extensions.bazaar import (
    OutputConfig,
    bazaar_resource_server_extension,
    declare_discovery_extension,
)
from x402.http import HTTPFacilitatorClient, PaymentOption
from x402.http.middleware.fastapi import PaymentMiddlewareASGI
from x402.http.types import RouteConfig
from x402.mechanisms.evm.exact import ExactEvmServerScheme
from x402.mechanisms.svm.exact import ExactSvmServerScheme
from x402.schemas import Network
from x402.server import x402ResourceServer

load_dotenv()

EVM_ADDRESS = os.getenv("EVM_ADDRESS")
SVM_ADDRESS = os.getenv("SVM_ADDRESS")
EVM_NETWORK: Network = "eip155:84532"  # Base Sepolia
SVM_NETWORK: Network = "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1"  # Solana Devnet

if not EVM_ADDRESS or not SVM_ADDRESS:
    raise ValueError(
        "Set EVM_ADDRESS and SVM_ADDRESS to the payment receiver addresses."
    )

# CDP swap: create_facilitator_config() reads CDP_API_KEY_ID / CDP_API_KEY_SECRET
# and authenticates verify/settle against the CDP hosted facilitator.
server = x402ResourceServer(HTTPFacilitatorClient(create_facilitator_config()))
server.register(EVM_NETWORK, ExactEvmServerScheme())
server.register(SVM_NETWORK, ExactSvmServerScheme())
# Enriches each route's Bazaar declaration with its HTTP method and path params.
server.register_extension(bazaar_resource_server_extension)

payment_options = [
    PaymentOption(
        scheme="exact", pay_to=EVM_ADDRESS, price="$0.01", network=EVM_NETWORK
    ),
    PaymentOption(
        scheme="exact", pay_to=SVM_ADDRESS, price="$0.01", network=SVM_NETWORK
    ),
]

# declare_discovery_extension makes the route discoverable in the Bazaar. Its
# routeTemplate (":city") collapses every concrete URL into one catalog entry.
routes = {
    "GET /weather/:city": RouteConfig(
        accepts=payment_options,
        mime_type="application/json",
        description="Current weather conditions for a city",
        extensions=declare_discovery_extension(
            path_params_schema={
                "properties": {
                    "city": {"type": "string", "description": "City name slug"}
                },
                "required": ["city"],
            },
            output=OutputConfig(
                example={"city": "san-francisco", "weather": "foggy", "temperature": 60}
            ),
        ),
    ),
}

app = FastAPI()
app.add_middleware(PaymentMiddlewareASGI, routes=routes, server=server)


@app.get("/health")
async def health_check() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/weather/{city}")
async def get_weather(city: str) -> dict:
    conditions = {
        "san-francisco": {"weather": "foggy", "temperature": 60},
        "new-york": {"weather": "cloudy", "temperature": 55},
        "tokyo": {"weather": "rainy", "temperature": 65},
    }
    return {
        "city": city,
        **conditions.get(city, {"weather": "sunny", "temperature": 70}),
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=4021)
