# Usage: uv run python x402/clients/mcp/simple.py

"""Call x402-paid MCP tools with a CDP-managed wallet.

The signer is a CDP Server Wallet exposed through eth_account's LocalAccount
interface via EvmLocalAccount, registered onto a standard x402Client -- no
private keys. create_x402_mcp_client runs the 402 -> pay -> retry loop for you.

Setup:
  1. Start the server:  uv run python x402/servers/mcp/server.py
  2. Set CDP_API_KEY_ID, CDP_API_KEY_SECRET, CDP_WALLET_SECRET in examples/python/.env.
  3. Fund the printed address with USDC on Base Sepolia, or set
     CDP_FUND_FROM_FAUCET=true to self-fund on first run.

Run:
  uv run python x402/clients/mcp/simple.py
"""

import asyncio
import os

from cdp import CdpClient
from cdp.evm_local_account import EvmLocalAccount
from dotenv import load_dotenv
from x402 import x402Client
from x402.mcp import create_x402_mcp_client
from x402.mechanisms.evm.exact import ExactEvmScheme

load_dotenv()

SERVER_URL = os.getenv("MCP_SERVER_URL", "http://localhost:4022")
NETWORK = "eip155:84532"  # Base Sepolia


async def main() -> None:
    async with CdpClient() as cdp:
        account = await cdp.evm.get_or_create_account(name="x402-client-wallet-1")
        signer = EvmLocalAccount(account)
        print(f"Paying from {signer.address}")

        if os.getenv("CDP_FUND_FROM_FAUCET", "").lower() == "true":
            await cdp.evm.request_faucet(
                address=signer.address, network="base-sepolia", token="usdc"
            )

        payment_client = x402Client()
        payment_client.register(NETWORK, ExactEvmScheme(signer))

        async with create_x402_mcp_client(payment_client, SERVER_URL) as mcp:
            tools = (await mcp.list_tools()).tools
            print("Tools:", ", ".join(t.name for t in tools))

            ping = await mcp.call_tool("ping", {})
            print(f"ping -> {ping.content[0].text}")

            report = await mcp.call_tool("generate_report", {"topic": "USDC on Base"})
            print(f"generate_report -> {report.content[0].text}")
            if report.payment_response and report.payment_response.transaction:
                print(f"Settled tx: {report.payment_response.transaction}")


if __name__ == "__main__":
    asyncio.run(main())
