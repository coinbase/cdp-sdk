# Usage: uv run python x402/servers/flask/server.py

"""Flask resource server protected by x402, powered by the CDP SDK.

The CDP wiring is identical to ``x402/servers/fastapi/server.py`` -- the CDP
facilitator settles the payment and a CDP Server Wallet receives it. Only the
framework differs: Flask is synchronous, so it pairs ``x402ResourceServerSync``
with ``HTTPFacilitatorClientSync``. Handing Flask the async ``x402ResourceServer``
raises a TypeError.

Setup: set CDP_API_KEY_ID, CDP_API_KEY_SECRET and CDP_WALLET_SECRET in
examples/python/.env. CDP_WALLET_SECRET is only needed when PAY_TO is unset.

Run: uv run python x402/servers/flask/server.py   # http://localhost:8402
"""

import asyncio
import os

from cdp import CdpClient
from cdp.x402 import create_facilitator_config
from dotenv import load_dotenv
from flask import Flask, jsonify
from x402.http import HTTPFacilitatorClientSync, PaymentOption
from x402.http.middleware.flask import payment_middleware
from x402.http.types import RouteConfig
from x402.mechanisms.evm.exact import ExactEvmServerScheme
from x402.schemas import Network
from x402.server import x402ResourceServerSync

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


# Only the CDP wallet lookup is async, so it runs once up front and the rest of
# the server stays synchronous.
PAY_TO = asyncio.run(resolve_pay_to())

app = Flask(__name__)

# CDP swap: create_facilitator_config() reads CDP_API_KEY_ID / CDP_API_KEY_SECRET
# and authenticates verify/settle against the CDP hosted facilitator.
server = x402ResourceServerSync(HTTPFacilitatorClientSync(create_facilitator_config()))
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
payment_middleware(app, routes=routes, server=server)


@app.route("/report")
def get_report():
    return jsonify({"report": "..."})


if __name__ == "__main__":
    print(f"Receiving EVM payments at {PAY_TO}")
    app.run(host="0.0.0.0", port=PORT, debug=False)
