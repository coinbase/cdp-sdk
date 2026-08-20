#!/usr/bin/env python3
# Usage: uv run python evm/swaps/reproduce_nullable_swap_fee_validation.py
"""Reproduce the Python SDK nullable swap-fee failure with a live CDP quote.

The example fetches one Base-mainnet USDC-to-WETH swap quote using the CDP
project credentials in ``.env``. It never signs, submits, or executes a
transaction. Creating a quote can be rate limited and may create a short-lived
soft reservation; use it only for diagnosis.
The raw API response is inspected before SDK deserialization. If its fee payload
contains ``"gasFee": null``, affected SDK versions reproduce the customer's
``CommonSwapResponseFees`` Pydantic ValidationError.
"""

import asyncio
import json
from importlib.metadata import version

from dotenv import load_dotenv
from pydantic import ValidationError

from cdp import CdpClient
from cdp.openapi_client.models.create_evm_swap_quote_request import (
    CreateEvmSwapQuoteRequest,
)
from cdp.openapi_client.models.create_swap_quote_response import (
    CreateSwapQuoteResponse,
)
from cdp.openapi_client.models.evm_swaps_network import EvmSwapsNetwork

load_dotenv()

USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
WETH = "0x4200000000000000000000000000000000000006"


async def fetch_quote() -> dict:
    """Request a quote without deserializing its response through the SDK."""
    async with CdpClient() as cdp:
        accounts = await cdp.evm.list_accounts(page_size=1)
        if not accounts.accounts:
            raise RuntimeError(
                "The configured CDP project has no EVM server account to use as the taker."
            )

        request = CreateEvmSwapQuoteRequest(
            network=EvmSwapsNetwork("base"),
            from_token=USDC,
            to_token=WETH,
            from_amount="1000000",  # 1 USDC in atomic units
            taker=accounts.accounts[0].address,
            slippage_bps=100,
        )
        response = await cdp.api_clients.evm_swaps.create_evm_swap_quote_without_preload_content(
            request
        )
        if response.status != 201:
            raise RuntimeError(f"Swap quote request returned HTTP {response.status}.")

        return json.loads((await response.read()).decode("utf-8"))


async def main() -> None:
    """Fetch and deserialize a live quote, displaying only its fee fields."""
    print(f"cdp-sdk version: {version('cdp-sdk')}")
    payload = await fetch_quote()
    fees = payload.get("fees")
    print("Raw API fee payload:")
    print(json.dumps(fees, indent=2))

    try:
        CreateSwapQuoteResponse.from_dict(payload)
    except ValidationError as error:
        print("\nReproduced the nullable gas-fee validation error from a live quote:")
        print(error)
        return

    raise RuntimeError(
        "The live quote parsed successfully; this SDK version includes the fix or "
        "the API did not return a null gasFee for this request."
    )


if __name__ == "__main__":
    asyncio.run(main())
