"""Unit tests for DEX aggregator quote fetching."""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from agent.swap_quotes import get_kyber_quote, get_swap_quote
from tests.conftest import USDC_BASE, WETH_BASE


class _MockResponse:
    def __init__(self, payload: dict, status: int = 200) -> None:
        self._payload = payload
        self.status = status

    async def json(self) -> dict:
        return self._payload

    async def __aenter__(self):
        return self

    async def __aexit__(self, *args):
        pass


@pytest.mark.asyncio
async def test_get_kyber_quote_parses_success():
    payload = {
        "code": 0,
        "data": {"routeSummary": {"amountOut": "1578144795", "gasUsd": "0.12"}},
    }
    session = MagicMock()
    session.get = MagicMock(return_value=_MockResponse(payload))

    quote = await get_kyber_quote(WETH_BASE, USDC_BASE, 10**18, session=session)
    assert quote is not None
    assert quote.provider == "kyber"
    assert quote.amount_out == 1_578_144_795
    assert quote.gas_usd == 0.12


@pytest.mark.asyncio
async def test_get_kyber_quote_returns_none_on_error():
    session = MagicMock()
    session.get = MagicMock(return_value=_MockResponse({"code": 1, "message": "fail"}, status=400))

    quote = await get_kyber_quote(WETH_BASE, USDC_BASE, 10**18, session=session)
    assert quote is None


@pytest.mark.asyncio
async def test_get_swap_quote_identity_same_token():
    quote = await get_swap_quote(WETH_BASE, WETH_BASE, 10**18)
    assert quote is not None
    assert quote.provider == "identity"
    assert quote.amount_out == 10**18


@pytest.mark.asyncio
async def test_get_swap_quote_zero_amount():
    quote = await get_swap_quote(WETH_BASE, USDC_BASE, 0)
    assert quote is None


@pytest.mark.asyncio
async def test_get_swap_quote_prefers_oneinch_when_key_set():
    oneinch_quote = MagicMock()
    oneinch_quote.provider = "1inch"
    with patch("agent.swap_quotes.get_oneinch_quote", new_callable=AsyncMock, return_value=oneinch_quote):
        with patch("agent.swap_quotes.get_kyber_quote", new_callable=AsyncMock) as kyber:
            quote = await get_swap_quote(
                WETH_BASE,
                USDC_BASE,
                10**18,
                oneinch_api_key="test-key",
                provider="auto",
            )
    assert quote.provider == "1inch"
    kyber.assert_not_called()
