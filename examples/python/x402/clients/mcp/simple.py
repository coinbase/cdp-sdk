# Usage: uv run python x402/clients/mcp/simple.py

"""Call x402-paid MCP tools with a CDP-managed wallet.

The signer is a CDP Server Wallet reached through eth_account's account
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
from x402.mechanisms.evm import EthAccountSigner
from x402.mechanisms.evm.exact import ExactEvmScheme

load_dotenv()

SERVER_URL = os.getenv("MCP_SERVER_URL", "http://localhost:4022")
NETWORK = "eip155:84532"  # Base Sepolia


async def main() -> None:
    async with CdpClient() as cdp:
        account = await cdp.evm.get_or_create_account(name="x402-client-wallet-1")
        # EthAccountSigner adapts the CDP account to the x402 signer protocol.
        signer = EthAccountSigner(EvmLocalAccount(account))
        print(f"Paying from {signer.address}")

        # The same CDP credentials power both the faucet and the facilitator.
        if os.getenv("CDP_FUND_FROM_FAUCET", "").lower() == "true":
            tx = await cdp.evm.request_faucet(
                address=signer.address, network="base-sepolia", token="usdc"
            )
            print(f"Requested USDC from the CDP faucet: {tx}")
            print("Wait for it to confirm, then re-run without the flag to pay.")
            return

        payment_client = x402Client()
        payment_client.register(NETWORK, ExactEvmScheme(signer))

        async with create_x402_mcp_client(payment_client, SERVER_URL) as mcp:
            tools = (await mcp.list_tools()).tools
            print("Tools:", ", ".join(t.name for t in tools))

            ping = await mcp.call_tool("ping", {})
            print(f"ping -> {ping.content[0].text}")

            report = await mcp.call_tool("generate_report", {"topic": "USDC on Base"})
            print(f"generate_report -> {report.content[0].text}")
            # payment_response is a SettleResponse, or the raw dict if it could
            # not be parsed, so read the receipt without assuming either shape.
            receipt = report.payment_response
            tx_hash = (
                receipt.get("transaction")
                if isinstance(receipt, dict)
                else getattr(receipt, "transaction", None)
            )
            if tx_hash:
                print(f"Settled tx: {tx_hash}")


if __name__ == "__main__":
    asyncio.run(main())
