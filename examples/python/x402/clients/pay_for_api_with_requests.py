# Usage: uv run python x402/clients/pay_for_api_with_requests.py

"""Pay for an x402-protected API with requests instead of httpx.

The CDP wiring is identical to ``pay_for_api.py`` -- ``EvmLocalAccount`` exposes
a CDP Server Wallet as a signer, so there is no private key to store. Only the
transport differs: the sync ``x402ClientSync`` pairs with ``x402_requests``,
where the async ``x402Client`` pairs with ``x402HttpxClient``. Mixing the two
raises a TypeError.

Only the CDP wallet lookup is async, so it runs once up front and the paid
request stays synchronous.

Setup: set CDP_API_KEY_ID, CDP_API_KEY_SECRET and CDP_WALLET_SECRET in
examples/python/.env, then fund the printed address with Base Sepolia USDC, or
set CDP_FUND_FROM_FAUCET=true to self-fund on the first run.

Run: uv run python x402/clients/pay_for_api_with_requests.py
"""

import asyncio
import os

from cdp import CdpClient
from cdp.evm_local_account import EvmLocalAccount
from dotenv import load_dotenv
from x402 import x402ClientSync
from x402.http import x402HTTPClientSync
from x402.http.clients import x402_requests
from x402.mechanisms.evm import EthAccountSigner
from x402.mechanisms.evm.exact import ExactEvmScheme
from x402.mechanisms.evm.upto import UptoEvmScheme

load_dotenv()

API_URL = os.getenv("X402_API_URL", "https://x402.vercel.app/protected")
NETWORK = "eip155:84532"  # Base Sepolia


async def create_signer() -> tuple[EthAccountSigner, bool]:
    """Resolve the CDP-managed wallet, and report whether the faucet was called."""
    requested_faucet = False
    async with CdpClient() as cdp:
        account = await cdp.evm.get_or_create_account(name="x402-client-wallet-1")
        # EthAccountSigner adapts the CDP account to the x402 signer protocol.
        signer = EthAccountSigner(EvmLocalAccount(account))

        # The same CDP credentials power both the faucet and the facilitator.
        if os.getenv("CDP_FUND_FROM_FAUCET", "").lower() == "true":
            tx = await cdp.evm.request_faucet(
                address=signer.address, network="base-sepolia", token="usdc"
            )
            print(f"Requested USDC from the CDP faucet: {tx}")
            requested_faucet = True

    # The signer keeps its own sync HTTP client, so it outlives the CDP client.
    return signer, requested_faucet


def main() -> None:
    signer, requested_faucet = asyncio.run(create_signer())
    print(f"Paying from {signer.address}")

    if requested_faucet:
        print("Wait for it to confirm, then re-run without the flag to pay.")
        return

    payment_client = x402ClientSync()
    payment_client.register(NETWORK, ExactEvmScheme(signer))
    payment_client.register(NETWORK, UptoEvmScheme(signer))

    with x402_requests(payment_client) as session:
        response = session.get(API_URL)

    print(f"HTTP {response.status_code} ({len(response.content)} bytes)")

    # PAYMENT-RESPONSE carries the settlement receipt for the retried request.
    # A 200 can arrive without one if the endpoint did not charge, so treat a
    # missing receipt as information rather than an error.
    http_client = x402HTTPClientSync(payment_client)
    try:
        settled = http_client.get_payment_settle_response(response.headers.get)
        print(f"Settled tx: {settled.transaction}")
    except ValueError:
        print("No settlement receipt on the response — nothing was charged.")


if __name__ == "__main__":
    main()
