"""Tests for the settlement-aware HTTP transports in wrap_httpx.py."""

from __future__ import annotations

import base64
import json
from typing import Any
from unittest.mock import AsyncMock, MagicMock

from cdp.x402.core.guardrails.apply import (
    apply_spend_controls,
)
from cdp.x402.core.guardrails.types import Amount, SpendControls
from cdp.x402.core.guardrails.wrap_httpx import (
    _is_settled,
    cdp_x402_httpx_transport,
)

USDC = "0x036cbd53842c5426634e7929541ec2318f3dcf7e"

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _encode_settle_response(success: bool) -> str:
    payload = json.dumps({"success": success, "transaction": "0xabc", "network": "eip155:84532"})
    return base64.b64encode(payload.encode()).decode()


def _make_httpx_response(status: int, settle_success: bool | None = None) -> Any:
    """Build a minimal httpx.Response-like mock."""
    headers: dict[str, str] = {}
    if settle_success is not None:
        headers["x-payment-response"] = _encode_settle_response(settle_success)

    class FakeHeaders:
        def __init__(self, d: dict[str, str]) -> None:
            self._d = {k.lower(): v for k, v in d.items()}

        def get(self, name: str) -> str | None:
            return self._d.get(name.lower())

    resp = MagicMock()
    resp.status_code = status
    resp.is_success = 200 <= status < 300
    resp.headers = FakeHeaders(headers)
    resp.json = MagicMock(side_effect=Exception("no body"))
    return resp


# ---------------------------------------------------------------------------
# _is_settled
# ---------------------------------------------------------------------------


class TestIsSettled:
    def test_2xx_no_header_is_settled(self) -> None:
        assert _is_settled(True, _make_httpx_response(200).headers) is True

    def test_2xx_success_true_is_settled(self) -> None:
        assert _is_settled(True, _make_httpx_response(200, settle_success=True).headers) is True

    def test_2xx_success_false_is_not_settled(self) -> None:
        assert _is_settled(True, _make_httpx_response(200, settle_success=False).headers) is False

    def test_non_2xx_is_not_settled(self) -> None:
        assert _is_settled(False, _make_httpx_response(400).headers) is False

    def test_non_2xx_with_success_header_is_settled(self) -> None:
        assert _is_settled(False, _make_httpx_response(403, settle_success=True).headers) is True

    def test_non_2xx_with_success_false_header_is_not_settled(self) -> None:
        assert _is_settled(False, _make_httpx_response(403, settle_success=False).headers) is False

    def test_2xx_with_malformed_header_is_not_settled(self) -> None:
        class FakeHeaders:
            def get(self, name: str) -> str | None:
                if name.lower() == "x-payment-response":
                    return "not-base64!!!"
                return None

        assert _is_settled(True, FakeHeaders()) is False


# ---------------------------------------------------------------------------
# Settlement-aware transport — confirm / rollback dispatch
# ---------------------------------------------------------------------------


class TestCdpSettlementAwareTransport:
    """Integration-style tests for the httpx transport using a real x402Client."""

    def _make_client_with_controls(self) -> Any:
        """Return (x402Client, SpendControls resolved) with a tracking scheme."""
        from x402.client import x402Client

        class FakeScheme:
            scheme = "exact"

            def __init__(self) -> None:
                self.calls: list[Any] = []

            def create_payment_payload(self, req: Any) -> dict:
                self.calls.append(req)
                return {"stub": True}

        client = x402Client()
        scheme = FakeScheme()
        client.register("eip155:84532", scheme)

        resolved = apply_spend_controls(
            client,
            SpendControls(
                max_cumulative_spend=Amount(atomic=1_000_000, asset=USDC),
            ),
        )
        return client, resolved, scheme

    async def _run_transport(
        self,
        client: Any,
        settle_success: bool | None,
        second_status: int = 200,
    ) -> None:
        """Drive the transport through a 402 → retry flow with a fake inner transport."""
        import httpx
        from x402.schemas.payments import PaymentRequired, PaymentRequirements

        reqs = [
            PaymentRequirements(
                scheme="exact",
                network="eip155:84532",
                asset=USDC,
                amount="100000",
                pay_to="0x1111111111111111111111111111111111111111",
                max_timeout_seconds=60,
            )
        ]
        payment_required = PaymentRequired(x402_version=2, accepts=reqs)

        pr_header_val = base64.b64encode(
            payment_required.model_dump_json(by_alias=True, exclude_none=True).encode()
        ).decode()

        first_response = MagicMock()
        first_response.status_code = 402
        first_response.headers = MagicMock()
        first_response.headers.get = lambda name: (
            pr_header_val if name.upper() in ("PAYMENT-REQUIRED", "X-PAYMENT-REQUIRED") else None
        )
        first_response.json = MagicMock(return_value=None)
        first_response.aread = AsyncMock()

        second_response = _make_httpx_response(second_status, settle_success)
        second_response.aread = AsyncMock()

        call_count = 0

        class FakeInnerTransport(httpx.AsyncBaseTransport):
            async def handle_async_request(self, request: httpx.Request) -> Any:
                nonlocal call_count
                call_count += 1
                if call_count == 1:
                    return first_response
                return second_response

        transport = cdp_x402_httpx_transport(client, FakeInnerTransport())
        request = httpx.Request("GET", "https://example.com/paid")
        await transport.handle_async_request(request)

    async def test_confirm_called_on_success(self) -> None:
        from cdp.x402.core.guardrails.spend_tracker import TotalSpendQuery

        client, resolved, _ = self._make_client_with_controls()
        await self._run_transport(client, settle_success=True, second_status=200)

        total = await resolved.tracker.total(TotalSpendQuery(asset=USDC))
        assert total == 100_000

    async def test_rollback_called_on_non_2xx(self) -> None:
        from cdp.x402.core.guardrails.spend_tracker import TotalSpendQuery

        client, resolved, _ = self._make_client_with_controls()
        await self._run_transport(client, settle_success=None, second_status=402)

        total = await resolved.tracker.total(TotalSpendQuery(asset=USDC))
        assert total == 0

    async def test_rollback_called_on_success_false_header(self) -> None:
        from cdp.x402.core.guardrails.spend_tracker import TotalSpendQuery

        client, resolved, _ = self._make_client_with_controls()
        await self._run_transport(client, settle_success=False, second_status=200)

        total = await resolved.tracker.total(TotalSpendQuery(asset=USDC))
        assert total == 0

    async def test_confirm_called_when_non_2xx_but_success_true_header(self) -> None:
        """Settlement header is authoritative: non-2xx + success:true must commit spend."""
        from cdp.x402.core.guardrails.spend_tracker import TotalSpendQuery

        client, resolved, _ = self._make_client_with_controls()
        await self._run_transport(client, settle_success=True, second_status=403)

        total = await resolved.tracker.total(TotalSpendQuery(asset=USDC))
        assert total == 100_000

    async def test_no_controls_transparent_passthrough(self) -> None:
        """Transport works normally when no spend controls are applied."""
        import httpx
        from x402.client import x402Client
        from x402.schemas.payments import PaymentRequired, PaymentRequirements

        reqs = [
            PaymentRequirements(
                scheme="exact",
                network="eip155:84532",
                asset=USDC,
                amount="100000",
                pay_to="0x1111111111111111111111111111111111111111",
                max_timeout_seconds=60,
            )
        ]
        payment_required = PaymentRequired(x402_version=2, accepts=reqs)
        pr_header_val = base64.b64encode(
            payment_required.model_dump_json(by_alias=True, exclude_none=True).encode()
        ).decode()

        class FakeScheme:
            scheme = "exact"

            def create_payment_payload(self, req: Any) -> dict:
                return {"stub": True}

        client = x402Client()
        client.register("eip155:84532", FakeScheme())

        first_response = MagicMock()
        first_response.status_code = 402
        first_response.headers = MagicMock()
        first_response.headers.get = lambda name: (
            pr_header_val if name.upper() in ("PAYMENT-REQUIRED", "X-PAYMENT-REQUIRED") else None
        )
        first_response.json = MagicMock(return_value=None)
        first_response.aread = AsyncMock()

        second_response = MagicMock()
        second_response.status_code = 200
        second_response.is_success = True
        second_response.headers = MagicMock()
        second_response.headers.get = MagicMock(return_value=None)

        call_count = 0

        class FakeInner(httpx.AsyncBaseTransport):
            async def handle_async_request(self, request: httpx.Request) -> Any:
                nonlocal call_count
                call_count += 1
                return first_response if call_count == 1 else second_response

        transport = cdp_x402_httpx_transport(client, FakeInner())
        request = httpx.Request("GET", "https://example.com/paid")
        response = await transport.handle_async_request(request)
        assert response.status_code == 200
