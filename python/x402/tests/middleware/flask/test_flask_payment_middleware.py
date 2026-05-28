"""Flask middleware-wrapper tests for ``cdp_x402.middleware.flask``."""

from __future__ import annotations

from flask import Flask, jsonify

from cdp_x402.middleware.flask import payment_middleware


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
    fake_facilitator_sync,
    network: str,
    pay_to: str,
    valid_payment_header: str,
) -> None:
    app = Flask(__name__)
    app.config["TESTING"] = True

    @app.get("/protected")
    def protected() -> object:
        return jsonify({"ok": True})

    payment_middleware(
        app,
        _routes(network, pay_to),
        facilitator_client=fake_facilitator_sync,
        schemes=None,
    )

    client = app.test_client()

    missing_payment = client.get("/protected")
    assert missing_payment.status_code == 402

    success = client.get("/protected", headers={"PAYMENT-SIGNATURE": valid_payment_header})
    assert success.status_code == 200
    assert success.get_json() == {"ok": True}
    assert "PAYMENT-RESPONSE" in success.headers
