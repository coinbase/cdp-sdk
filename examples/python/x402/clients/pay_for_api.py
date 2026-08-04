# Usage: uv run python x402/clients/pay_for_api.py

"""Pay for an x402-protected API with a CDP-managed wallet (async, httpx).

The standard x402 Foundation client stack with one CDP swap: the signer is a CDP
API Key Wallet reached through eth_account's account interface via
``EvmLocalAccount``, so there is no private key to store. ``x402HttpxClient``
runs the 402 -> pay -> retry loop for you.

Python's CDP SDK has no ``CdpX402Client`` (unlike TypeScript), so the payment
schemes are registered explicitly.

Setup: set CDP_API_KEY_ID, CDP_API_KEY_SECRET and CDP_WALLET_SECRET in
examples/python/.env, then fund the printed address with Base Sepolia USDC, or
set CDP_FUND_FROM_FAUCET=true to self-fund on the first run.

Run: uv run python x402/clients/pay_for_api.py
"""

import asyncio
import os

from cdp import CdpClient
from cdp.evm_local_account import EvmLocalAccount
from dotenv import load_dotenv
from x402 import x402Client
from x402.http import x402HTTPClient
from x402.http.clients import x402HttpxClient
from x402.mechanisms.evm import EthAccountSigner
from x402.mechanisms.evm.exact import ExactEvmScheme
from x402.mechanisms.evm.upto import UptoEvmScheme

load_dotenv()

API_URL = os.getenv("X402_API_URL", "https://x402.vercel.app/protected")
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

        # TypeScript's CdpX402Client registers these schemes for you.
        payment_client = x402Client()
        payment_client.register(NETWORK, ExactEvmScheme(signer))
        payment_client.register(NETWORK, UptoEvmScheme(signer))

        async with x402HttpxClient(payment_client) as http:
            response = await http.get(API_URL)
            await response.aread()

        print(f"HTTP {response.status_code} ({len(response.content)} bytes)")

        # PAYMENT-RESPONSE carries the settlement receipt for the retried request.
        # A 200 can arrive without one if the endpoint did not charge, so treat a
        # missing receipt as information rather than an error.
        http_client = x402HTTPClient(payment_client)
        try:
            settled = http_client.get_payment_settle_response(response.headers.get)
            print(f"Settled tx: {settled.transaction}")
        except ValueError:
            print("No settlement receipt on the response — nothing was charged.")


if __name__ == "__main__":
    asyncio.run(main())
