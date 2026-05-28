"""
Flask resource server protected with x402 and the CDP facilitator.

Requires environment variables:
  CDP_SERVER_API_KEY_ID, CDP_SERVER_API_KEY_SECRET, CDP_SERVER_WALLET_SECRET

Run:
  pip install "cdp-x402[server-flask]"
  flask --app server run
"""

import asyncio

from flask import Flask, jsonify
from x402.http import RouteConfig
from x402.http.middleware.flask import payment_middleware
from x402.server import x402ResourceServerSync

from cdp_x402 import (
    create_cdp_facilitator_client_sync,
    create_cdp_resource_server,
    get_cdp_default_schemes,
    get_cdp_extension_registrations,
)


async def _provision() -> tuple[dict[str, RouteConfig], str, str]:
    """Provision CDP receiver wallets and return resolved route data.

    Uses only the pure-data fields from CdpResourceServer (routes_config,
    pay_to_evm_address, pay_to_svm_address). The async resource server
    object is not retained so its HTTP sessions are released when the
    event loop closes at the end of asyncio.run().
    """
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
    return server.routes_config, server.pay_to_evm_address, server.pay_to_svm_address


# asyncio.run() bridges the async CDP provisioning into Flask's sync context.
# Only pure-data fields are returned; the async server is not retained.
_routes_config, _pay_to_evm_address, _pay_to_svm_address = asyncio.run(_provision())

print(
    f"Receiving EVM payments at {_pay_to_evm_address}\n"
    f"Receiving Solana payments at {_pay_to_svm_address}"
)

# Flask requires a synchronous x402ResourceServerSync (not the async variant).
# Build one with the same CDP facilitator and extensions so the middleware
# returns the correct PaymentRequired extension data (gas-sponsoring, bazaar).
# create_cdp_facilitator_client_sync() reads CDP_SERVER_API_KEY_ID / CDP_SERVER_API_KEY_SECRET.
_sync_server = x402ResourceServerSync(create_cdp_facilitator_client_sync())
for _scheme in get_cdp_default_schemes():
    _sync_server.register(_scheme.network, _scheme.server)
for _ext in get_cdp_extension_registrations():
    _sync_server.register_extension(_ext)

app = Flask(__name__)

# _routes_config has pay_to fields filled and CDP extensions injected.
payment_middleware(
    app,
    routes=_routes_config,
    server=_sync_server,
    # sync_facilitator_on_start defaults to True: _sync_server is a freshly constructed
    # sync server (separate from the async one provisioned above), so the middleware must
    # initialize it on the first request.
)


@app.get("/report")
def report():
    return jsonify({"report": "..."})
