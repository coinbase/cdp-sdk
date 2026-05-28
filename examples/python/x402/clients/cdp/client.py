"""
CDP Server Wallet payment client.

Demonstrates how to use ``cdp_x402`` with a CDP Server Wallet (EOA) or
Smart Contract Wallet (SCW) to make requests to x402-protected endpoints.

Wallet type is controlled by the ``CDP_WALLET_TYPE`` environment variable:
  ``cdp-eoa``   (default) — CDP Server Wallet (EOA)
  ``cdp-smart``           — CDP Smart Contract Wallet (ERC-4337)

Required environment variables:
  CDP_API_KEY_ID       — Your CDP API key ID
  CDP_API_KEY_SECRET   — Your CDP API key secret
  CDP_WALLET_SECRET    — Your CDP wallet secret

Optional environment variables:
  CDP_WALLET_TYPE      — Wallet backend (default: "cdp-eoa")
  CDP_ACCOUNT_NAME     — Named CDP account (default: "x402-server-wallet-1")
  CDP_OWNER_ACCOUNT_NAME — Owner EOA name for cdp-smart wallets
  RESOURCE_SERVER_URL  — Base URL of the x402-protected server
  ENDPOINT_PATH        — Path of the protected endpoint

Run:
  uv run client.py
  # or
  python client.py
"""

import asyncio
import logging
import os

import httpx
from x402.http.clients.httpx import x402AsyncTransport

from cdp_x402 import CdpX402ClientConfig, WalletConfig, create_cdp_x402_client

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
log = logging.getLogger(__name__)

BASE_URL = os.environ.get("RESOURCE_SERVER_URL", "http://localhost:4021")
ENDPOINT_PATH = os.environ.get("ENDPOINT_PATH", "/weather")
URL = f"{BASE_URL}{ENDPOINT_PATH}"


async def main() -> None:
    wallet_type = os.environ.get("CDP_WALLET_TYPE", "cdp-eoa")
    owner_account_name = os.environ.get("CDP_OWNER_ACCOUNT_NAME")

    wallet_config = WalletConfig(
        type=wallet_type,  # type: ignore[arg-type]
        owner_account_name=owner_account_name,
    )

    result = await create_cdp_x402_client(
        CdpX402ClientConfig(wallet_config=wallet_config)
    )

    log.info("Wallet type:    %s", wallet_type)
    log.info("Wallet address: %s", result.evm_address)
    if result.owner_wallet:
        log.info("Owner wallet:   %s", result.owner_wallet)

    transport = x402AsyncTransport(result.client)

    log.info("Making request to: %s", URL)

    async with httpx.AsyncClient(transport=transport) as http:
        response = await http.get(URL)

    log.info("Response status: %s", response.status_code)
    content_type = response.headers.get("content-type", "")
    if "application/json" in content_type:
        log.info("Response body: %s", response.json())
    else:
        log.info("Response body: %s", response.text)


if __name__ == "__main__":
    asyncio.run(main())
