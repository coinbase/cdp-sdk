"""Live DEX aggregator quotes for liquidation profit estimation."""

from __future__ import annotations

import logging
from dataclasses import dataclass

import aiohttp

logger = logging.getLogger(__name__)

KYBERSWAP_BASE_URL = "https://aggregator-api.kyberswap.com/base/api/v1/routes"
ONEINCH_QUOTE_URL = "https://api.1inch.com/swap/v6.1/{chain_id}/quote"
KYBER_CLIENT_ID = "cdp-flash-liquidator"


@dataclass(frozen=True)
class SwapQuote:
    token_in: str
    token_out: str
    amount_in: int
    amount_out: int
    provider: str
    gas_usd: float = 0.0


async def get_kyber_quote(
    token_in: str,
    token_out: str,
    amount_in: int,
    *,
    session: aiohttp.ClientSession | None = None,
) -> SwapQuote | None:
    if amount_in <= 0:
        return None

    params = {
        "tokenIn": token_in,
        "tokenOut": token_out,
        "amountIn": str(amount_in),
    }
    headers = {"X-Client-Id": KYBER_CLIENT_ID}

    close_session = session is None
    if session is None:
        session = aiohttp.ClientSession()

    try:
        async with session.get(
            KYBERSWAP_BASE_URL,
            params=params,
            headers=headers,
            timeout=aiohttp.ClientTimeout(total=15),
        ) as resp:
            payload = await resp.json()
            if resp.status != 200 or payload.get("code") != 0:
                logger.debug("KyberSwap quote failed: %s", payload.get("message", resp.status))
                return None

            summary = payload.get("data", {}).get("routeSummary", {})
            amount_out = int(summary.get("amountOut", 0))
            if amount_out <= 0:
                return None

            gas_usd = float(summary.get("gasUsd") or 0)
            return SwapQuote(
                token_in=token_in,
                token_out=token_out,
                amount_in=amount_in,
                amount_out=amount_out,
                provider="kyber",
                gas_usd=gas_usd,
            )
    except Exception as exc:
        logger.debug("KyberSwap quote error: %s", exc)
        return None
    finally:
        if close_session:
            await session.close()


async def get_oneinch_quote(
    token_in: str,
    token_out: str,
    amount_in: int,
    chain_id: int,
    api_key: str,
    *,
    session: aiohttp.ClientSession | None = None,
) -> SwapQuote | None:
    if amount_in <= 0:
        return None

    url = ONEINCH_QUOTE_URL.format(chain_id=chain_id)
    params = {
        "src": token_in,
        "dst": token_out,
        "amount": str(amount_in),
    }
    headers = {"Authorization": f"Bearer {api_key}"}

    close_session = session is None
    if session is None:
        session = aiohttp.ClientSession()

    try:
        async with session.get(
            url,
            params=params,
            headers=headers,
            timeout=aiohttp.ClientTimeout(total=15),
        ) as resp:
            if resp.status != 200:
                logger.debug("1inch quote HTTP %s", resp.status)
                return None
            payload = await resp.json()
            amount_out = int(payload.get("dstAmount", 0))
            if amount_out <= 0:
                return None
            return SwapQuote(
                token_in=token_in,
                token_out=token_out,
                amount_in=amount_in,
                amount_out=amount_out,
                provider="1inch",
            )
    except Exception as exc:
        logger.debug("1inch quote error: %s", exc)
        return None
    finally:
        if close_session:
            await session.close()


async def get_swap_quote(
    token_in: str,
    token_out: str,
    amount_in: int,
    *,
    chain_id: int = 8453,
    oneinch_api_key: str | None = None,
    provider: str = "auto",
    session: aiohttp.ClientSession | None = None,
) -> SwapQuote | None:
    """Fetch best available swap quote. Tries 1inch when keyed, always falls back to Kyber."""
    if token_in.lower() == token_out.lower():
        return SwapQuote(
            token_in=token_in,
            token_out=token_out,
            amount_in=amount_in,
            amount_out=amount_in,
            provider="identity",
        )

    close_session = session is None
    if session is None:
        session = aiohttp.ClientSession()

    try:
        if provider in ("auto", "1inch") and oneinch_api_key:
            quote = await get_oneinch_quote(
                token_in, token_out, amount_in, chain_id, oneinch_api_key, session=session
            )
            if quote is not None:
                return quote

        if provider in ("auto", "kyber"):
            return await get_kyber_quote(token_in, token_out, amount_in, session=session)

        return None
    finally:
        if close_session:
            await session.close()
