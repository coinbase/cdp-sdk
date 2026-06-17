"""
Flask resource server protected with x402 and the CDP facilitator.

Requires environment variables:
  CDP_SERVER_API_KEY_ID, CDP_SERVER_API_KEY_SECRET, CDP_SERVER_WALLET_SECRET

Run:
  pip install "cdp-sdk[x402-flask]"
  flask --app server run
"""

import asyncio

from dotenv import load_dotenv
from flask import Flask, jsonify
from x402.http import RouteConfig
from x402.http.middleware.flask import payment_middleware
from x402.server import x402ResourceServerSync

from cdp.x402 import (
    create_cdp_facilitator_client_sync,
    create_cdp_resource_server,
    get_cdp_default_schemes,
    get_cdp_extension_registrations,
)

load_dotenv()


async def _provision() -> tuple[dict[str, RouteConfig], str, str]:
    """Provision CDP receiver wallets and return resolved route data."""
    server = await create_cdp_resource_server(
        {
            "routes": {
                "GET /report": {
                    "price": "$0.01",
                    "description": "AI-generated report",
                    # Defaults to Base mainnet + Solana mainnet when omitted.
                    # "networks": ["eip155:8453"],
                },
            },
        }
    )
    return server.routes_config, server.pay_to_evm_address, server.pay_to_svm_address


_routes_config, _pay_to_evm_address, _pay_to_svm_address = asyncio.run(_provision())

print(
    f"Receiving EVM payments at {_pay_to_evm_address}\n"
    f"Receiving Solana payments at {_pay_to_svm_address}"
)

_sync_server = x402ResourceServerSync(create_cdp_facilitator_client_sync())
for _scheme in get_cdp_default_schemes():
    _sync_server.register(_scheme.network, _scheme.server)
for _ext in get_cdp_extension_registrations():
    _sync_server.register_extension(_ext)

app = Flask(__name__)

payment_middleware(app, routes=_routes_config, server=_sync_server)


@app.get("/report")
def report():
    return jsonify({"report": "..."})
