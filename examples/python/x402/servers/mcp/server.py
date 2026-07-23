# Usage: uv run python x402/servers/mcp/server.py

"""MCP server with x402-paid tools, using the CDP facilitator and a CDP-managed
receiver wallet.

Tools (over SSE):
  - generate_report (paid, $0.01)
  - ping            (free)

Setup:
  Set CDP_API_KEY_ID, CDP_API_KEY_SECRET, CDP_WALLET_SECRET in examples/python/.env,
  or set PAY_TO to an EVM address to skip provisioning a receiver wallet.

Run:
  uv run python x402/servers/mcp/server.py   # http://localhost:4022
"""

import asyncio
import os

from cdp import CdpClient
from cdp.x402 import create_facilitator_config
from dotenv import load_dotenv
from mcp.server.fastmcp import FastMCP
from x402.http import HTTPFacilitatorClientSync
from x402.mcp import create_payment_wrapper
from x402.mechanisms.evm.exact import ExactEvmServerScheme
from x402.schemas import ResourceConfig
from x402.server import x402ResourceServerSync

load_dotenv()

PORT = int(os.getenv("PORT", "4022"))
NETWORK = "eip155:84532"  # Base Sepolia


async def resolve_pay_to() -> str:
    """Return PAY_TO, else a CDP-managed Server Wallet address."""
    pay_to = os.getenv("PAY_TO")
    if pay_to:
        return pay_to
    async with CdpClient() as cdp:
        account = await cdp.evm.get_or_create_account(name="x402-mcp-receiver-wallet-1")
        return account.address


def generate_report(topic: str) -> str:
    """Mock report generator. Swap for your real data source."""
    return (
        f'AI report on "{topic}": demand is trending up, '
        "sentiment is positive, no anomalies detected."
    )


def main() -> None:
    pay_to = asyncio.run(resolve_pay_to())

    resource_server = x402ResourceServerSync(
        HTTPFacilitatorClientSync(create_facilitator_config())  # CDP hosted facilitator
    )
    resource_server.register(NETWORK, ExactEvmServerScheme())
    resource_server.initialize()

    accepts = resource_server.build_payment_requirements(
        ResourceConfig(
            scheme="exact",
            network=NETWORK,
            pay_to=pay_to,
            price="$0.01",
            extra={"name": "USDC", "version": "2"},
        )
    )
    paid = create_payment_wrapper(resource_server, accepts=accepts)

    mcp_server = FastMCP("x402 CDP Report Service", host="0.0.0.0", port=PORT)

    @mcp_server.tool(
        name="generate_report",
        description="Generate an AI report on a topic. Requires payment of $0.01 USDC.",
    )
    @paid
    async def generate_report_tool(topic: str) -> str:
        return generate_report(topic)

    @mcp_server.tool(name="ping", description="A free health check tool")
    async def ping() -> str:
        return "pong"

    print(f"x402 CDP MCP server running on http://localhost:{PORT}")
    print(f"  Receiving payments at {pay_to}")
    mcp_server.run(transport="sse")


if __name__ == "__main__":
    main()
