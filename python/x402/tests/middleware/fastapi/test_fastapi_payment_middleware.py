"""FastAPI middleware-wrapper tests for ``cdp_x402.middleware.fastapi``."""

from __future__ import annotations

from fastapi import FastAPI
from fastapi.testclient import TestClient

from cdp_x402.middleware.fastapi import payment_middleware


def _routes(network: str, pay_to: str) -> dict[str, dict[str, object]]:
    return {
        "GET /protected": {
            "accepts": {
                "scheme": "exact",
                "price": "$0.01",
                "network": network,
                "payTo": pay_to,
                "maxTimeoutSeconds": 300,
            }
        }
    }


def test_payment_middleware_uses_default_schemes_when_not_provided(
    fake_facilitator_async,
    network: str,
    pay_to: str,
    valid_payment_header: str,
) -> None:
    app = FastAPI()

    middleware = payment_middleware(
        _routes(network, pay_to),
        facilitator_client=fake_facilitator_async,
        schemes=None,
    )

    @app.middleware("http")
    async def x402_middleware(request, call_next):
        return await middleware(request, call_next)

    @app.get("/protected")
    async def protected() -> dict[str, bool]:
        return {"ok": True}

    client = TestClient(app)

    missing_payment = client.get("/protected")
    assert missing_payment.status_code == 402

    success = client.get("/protected", headers={"PAYMENT-SIGNATURE": valid_payment_header})
    assert success.status_code == 200
    assert success.json() == {"ok": True}
    assert "payment-response" in success.headers
