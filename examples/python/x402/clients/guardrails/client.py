"""
CDP Server Wallet payment client with spend controls.

Demonstrates how to use ``cdp.x402`` with a CDP Server Wallet and spend
guardrails to make requests to x402-protected endpoints. Per-payment and
cumulative caps are enforced locally — no payment is signed or sent if either
cap would be exceeded.

Required environment variables:
  CDP_API_KEY_ID       — Your CDP API key ID
  CDP_API_KEY_SECRET   — Your CDP API key secret
  CDP_WALLET_SECRET    — Your CDP wallet secret

Optional environment variables:
  CDP_ACCOUNT_NAME     — Named CDP account (default: "x402-server-wallet-1")
  RESOURCE_SERVER_URL  — Base URL of the x402-protected server
  ENDPOINT_PATH        — Path of the protected endpoint

Run:
  uv run client.py
"""

import asyncio
import logging
import os

from dotenv import load_dotenv

from cdp.x402 import (
    Amount,
    CDPx402ClientConfig,
    SpendControlError,
    SpendControls,
    create_cdp_x402_client,
)

load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
log = logging.getLogger(__name__)

BASE_URL = os.environ.get("RESOURCE_SERVER_URL", "http://localhost:4021")
ENDPOINT_PATH = os.environ.get("ENDPOINT_PATH", "/weather")
URL = f"{BASE_URL}{ENDPOINT_PATH}"

# USDC on Base Sepolia — always use the contract address, not a ticker symbol.
USDC_BASE_SEPOLIA = "0x036cbd53842c5426634e7929541ec2318f3dcf7e"


async def main() -> None:
    spend_controls = SpendControls(
        # Hard cap: 0.01 USDC per individual payment (USDC has 6 decimals).
        max_amount_per_payment=Amount(atomic=10_000, asset=USDC_BASE_SEPOLIA),
        # Rolling cap: 0.05 USDC per 24-hour window across all matching payments.
        max_cumulative_spend=Amount(atomic=50_000, asset=USDC_BASE_SEPOLIA),
        max_cumulative_spend_window="24h",
        # Allow-lists — restricts which networks and assets are paid with.
        allowed_networks=["eip155:84532"],  # Base Sepolia only
        allowed_assets=[USDC_BASE_SEPOLIA],
        # Notifier — fires once at 80% and once at 95% of the cumulative cap.
        on_approaching_limit=lambda spent, limit: log.warning(
            "[spend-controls] approaching cap: spent=%s/%s (asset=%s)",
            spent.atomic,
            limit.atomic,
            limit.asset or "n/a",
        ),
    )

    result = await create_cdp_x402_client(CDPx402ClientConfig(spend_controls=spend_controls))

    log.info("Wallet address: %s", result.evm_address)
    log.info("Making request to: %s", URL)

    try:
        async with result.async_client() as http:
            response = await http.get(URL)

        log.info("Response status: %s", response.status_code)
        content_type = response.headers.get("content-type", "")
        if "application/json" in content_type:
            log.info("Response body: %s", response.json())
        else:
            log.info("Response body: %s", response.text)

    except Exception as exc:
        cause = exc
        while cause is not None:
            if isinstance(cause, SpendControlError):
                log.error(
                    "[spend-controls] payment rejected: code=%s  %s", cause.code, cause
                )
                raise SystemExit(1) from exc
            cause = getattr(cause, "__cause__", None) or getattr(cause, "__context__", None)
        raise


if __name__ == "__main__":
    asyncio.run(main())
