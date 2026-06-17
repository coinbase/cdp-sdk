"""Flask middleware tests for ``cdp.x402.middleware.flask``."""

from __future__ import annotations

import base64
import json

import pytest
from flask import Flask, Response, jsonify, stream_with_context
from x402.mechanisms.evm.exact import ExactEvmServerScheme
from x402.mechanisms.evm.upto import UptoEvmServerScheme
from x402.schemas import SettleResponse, VerifyResponse

from cdp.x402.middleware._common import SETTLEMENT_OVERRIDES_HEADER
from cdp.x402.middleware.flask import CDPx402Flask
from cdp.test.x402.middleware.conftest import build_payment_signature_header


@pytest.fixture
def app(fake_facilitator_sync, network, pay_to) -> Flask:
    ext = CDPx402Flask(facilitator_client=fake_facilitator_sync)
    ext.register_scheme(network, ExactEvmServerScheme())

    flask_app = Flask(__name__)
    ext.init_app(flask_app)

    @flask_app.get("/free")
    def free() -> object:
        return jsonify({"ok": True})

    @flask_app.get("/protected")
    @ext.payment_required(price="$0.01", network=network, pay_to=pay_to)
    def protected() -> object:
        return jsonify({"protected": True})

    flask_app.config["TESTING"] = True
    return flask_app


def test_unprotected_route_returns_200(app: Flask) -> None:
    response = app.test_client().get("/free")
    assert response.status_code == 200
    assert response.get_json() == {"ok": True}


def test_protected_route_without_payment_returns_402_with_header(app: Flask) -> None:
    response = app.test_client().get("/protected")

    assert response.status_code == 402
    assert "PAYMENT-REQUIRED" in response.headers, dict(response.headers)

    decoded = json.loads(base64.b64decode(response.headers["PAYMENT-REQUIRED"]))
    assert decoded["x402Version"] == 2
    assert decoded["accepts"][0]["scheme"] == "exact"
    assert decoded["accepts"][0]["network"] == "eip155:8453"
    assert "Access-Control-Expose-Headers" in response.headers


def test_protected_route_with_valid_payment_settles_and_returns_200(
    app: Flask,
    valid_payment_header: str,
    fake_facilitator_sync,
) -> None:
    response = app.test_client().get(
        "/protected",
        headers={"PAYMENT-SIGNATURE": valid_payment_header},
    )

    assert response.status_code == 200
    assert response.get_json() == {"protected": True}
    assert "PAYMENT-RESPONSE" in response.headers
    assert len(fake_facilitator_sync.verify_calls) == 1
    assert len(fake_facilitator_sync.settle_calls) == 1


def test_protected_route_with_invalid_payment_returns_402(
    app: Flask,
    valid_payment_header: str,
    fake_facilitator_sync,
) -> None:
    fake_facilitator_sync.next_verify = VerifyResponse(
        is_valid=False, invalid_reason="bad_signature"
    )

    response = app.test_client().get(
        "/protected",
        headers={"PAYMENT-SIGNATURE": valid_payment_header},
    )

    assert response.status_code == 402
    assert "PAYMENT-REQUIRED" in response.headers
    decoded = json.loads(base64.b64decode(response.headers["PAYMENT-REQUIRED"]))
    assert "bad_signature" in decoded.get("error", "")
    assert fake_facilitator_sync.settle_calls == []


def test_protected_route_with_mismatched_requirements_returns_402_without_verification(
    app: Flask,
    pay_to: str,
    fake_facilitator_sync,
) -> None:
    mismatched_header = build_payment_signature_header(price="$0.02", pay_to=pay_to)
    response = app.test_client().get(
        "/protected",
        headers={"PAYMENT-SIGNATURE": mismatched_header},
    )

    assert response.status_code == 402
    assert "PAYMENT-REQUIRED" in response.headers
    decoded = json.loads(base64.b64decode(response.headers["PAYMENT-REQUIRED"]))
    assert "no matching payment" in decoded.get("error", "").lower()
    assert fake_facilitator_sync.verify_calls == []
    assert fake_facilitator_sync.settle_calls == []


def test_protected_route_with_malformed_payment_header_returns_402(app: Flask) -> None:
    response = app.test_client().get(
        "/protected",
        headers={"PAYMENT-SIGNATURE": "!!!not-base64!!!"},
    )

    assert response.status_code == 402
    assert "PAYMENT-REQUIRED" in response.headers


def test_protected_route_with_decodable_but_invalid_payment_payload_returns_402(
    app: Flask,
) -> None:
    malformed_but_decodable = base64.b64encode(b'{"x402Version":2}').decode()
    response = app.test_client().get(
        "/protected",
        headers={"PAYMENT-SIGNATURE": malformed_but_decodable},
    )
    assert response.status_code == 402
    assert "PAYMENT-REQUIRED" in response.headers


def test_v1_x_payment_header_is_also_accepted(app: Flask, valid_payment_header: str) -> None:
    response = app.test_client().get(
        "/protected",
        headers={"X-PAYMENT": valid_payment_header},
    )

    assert response.status_code == 200
    assert "PAYMENT-RESPONSE" in response.headers


def test_settlement_exception_returns_402(
    fake_facilitator_sync,
    network,
    pay_to,
    valid_payment_header: str,
    caplog: pytest.LogCaptureFixture,
) -> None:
    import logging

    fake_facilitator_sync.settle_error = RuntimeError("facilitator unreachable")

    ext = CDPx402Flask(facilitator_client=fake_facilitator_sync)
    ext.register_scheme(network, ExactEvmServerScheme())
    flask_app = Flask(__name__)
    ext.init_app(flask_app)

    @flask_app.get("/protected")
    @ext.payment_required(price="$0.01", network=network, pay_to=pay_to)
    def protected() -> object:
        return jsonify({"protected": True})

    flask_app.config["TESTING"] = True

    with caplog.at_level(logging.ERROR, logger="cdp.x402.middleware._common"):
        response = flask_app.test_client().get(
            "/protected",
            headers={"PAYMENT-SIGNATURE": valid_payment_header},
        )

    assert response.status_code == 402
    assert response.get_json() == {}
    assert "PAYMENT-RESPONSE" in response.headers
    assert len(fake_facilitator_sync.settle_calls) == 1
    assert any("settlement" in r.message.lower() for r in caplog.records)


def test_settlement_failure_response_returns_402_with_payment_response_header(
    fake_facilitator_sync,
    network,
    pay_to,
    valid_payment_header: str,
) -> None:
    fake_facilitator_sync.next_settle = SettleResponse(
        success=False,
        transaction="0xtx",
        network=network,
        errorReason="settlement_failed",
        errorMessage="insufficient allowance",
    )

    ext = CDPx402Flask(facilitator_client=fake_facilitator_sync)
    ext.register_scheme(network, ExactEvmServerScheme())
    flask_app = Flask(__name__)
    ext.init_app(flask_app)

    @flask_app.get("/protected")
    @ext.payment_required(price="$0.01", network=network, pay_to=pay_to)
    def protected() -> object:
        return jsonify({"protected": True})

    flask_app.config["TESTING"] = True

    response = flask_app.test_client().get(
        "/protected",
        headers={"PAYMENT-SIGNATURE": valid_payment_header},
    )

    assert response.status_code == 402
    assert response.get_json() == {}
    assert "PAYMENT-RESPONSE" in response.headers
    assert len(fake_facilitator_sync.settle_calls) == 1


def test_streaming_response_failure_does_not_settle(
    fake_facilitator_sync,
    network,
    pay_to,
    valid_payment_header: str,
) -> None:
    ext = CDPx402Flask(facilitator_client=fake_facilitator_sync)
    ext.register_scheme(network, ExactEvmServerScheme())
    flask_app = Flask(__name__)
    ext.init_app(flask_app)
    flask_app.config["TESTING"] = True

    @flask_app.get("/streaming-protected")
    @ext.payment_required(price="$0.01", network=network, pay_to=pay_to)
    def streaming_protected() -> object:
        @stream_with_context
        def broken_stream():
            yield b"partial"
            raise RuntimeError("stream failed")

        return Response(broken_stream(), mimetype="text/plain")

    with pytest.raises(RuntimeError, match="stream failed"):
        flask_app.test_client().get(
            "/streaming-protected",
            headers={"PAYMENT-SIGNATURE": valid_payment_header},
        )

    assert len(fake_facilitator_sync.settle_calls) == 0


def test_settlement_overrides_are_forwarded_and_not_leaked_in_response_headers(
    fake_facilitator_sync,
    network,
    pay_to,
) -> None:
    ext = CDPx402Flask(facilitator_client=fake_facilitator_sync)
    ext.register_scheme(network, UptoEvmServerScheme())
    flask_app = Flask(__name__)
    ext.init_app(flask_app)

    @flask_app.get("/upto-protected")
    @ext.payment_required(price="$0.10", network=network, pay_to=pay_to, scheme="upto")
    def upto_protected() -> object:
        response = jsonify({"protected": True})
        response.headers[SETTLEMENT_OVERRIDES_HEADER] = '{"amount":"123"}'
        return response

    flask_app.config["TESTING"] = True
    valid_upto_header = build_payment_signature_header(price="$0.10", pay_to=pay_to, scheme="upto")
    response = flask_app.test_client().get(
        "/upto-protected",
        headers={"PAYMENT-SIGNATURE": valid_upto_header},
    )

    assert response.status_code == 200
    assert response.get_json() == {"protected": True}
    assert "PAYMENT-RESPONSE" in response.headers
    assert "Settlement-Overrides" not in response.headers
    assert len(fake_facilitator_sync.settle_calls) == 1
    _payload, requirements = fake_facilitator_sync.settle_calls[0]
    assert requirements.amount == "123"


def test_facilitator_error_during_verify_returns_402(
    fake_facilitator_sync,
    network: str,
    pay_to: str,
    valid_payment_header: str,
) -> None:
    from x402.http.facilitator_client_base import FacilitatorResponseError

    fake_facilitator_sync.verify_error = FacilitatorResponseError("malformed facilitator response")

    ext = CDPx402Flask(facilitator_client=fake_facilitator_sync)
    ext.register_scheme(network, ExactEvmServerScheme())
    flask_app = Flask(__name__)
    ext.init_app(flask_app)

    @flask_app.get("/protected")
    @ext.payment_required(price="$0.01", network=network, pay_to=pay_to)
    def protected() -> object:
        return jsonify({"protected": True})

    flask_app.config["TESTING"] = True

    response = flask_app.test_client().get(
        "/protected",
        headers={"PAYMENT-SIGNATURE": valid_payment_header},
    )

    assert response.status_code == 402
    assert "PAYMENT-REQUIRED" in response.headers


def test_facilitator_error_during_settle_returns_502(
    fake_facilitator_sync,
    network: str,
    pay_to: str,
    valid_payment_header: str,
) -> None:
    from x402.http.facilitator_client_base import FacilitatorResponseError

    fake_facilitator_sync.settle_error = FacilitatorResponseError("facilitator schema error")

    ext = CDPx402Flask(facilitator_client=fake_facilitator_sync)
    ext.register_scheme(network, ExactEvmServerScheme())
    flask_app = Flask(__name__)
    ext.init_app(flask_app)

    @flask_app.get("/protected")
    @ext.payment_required(price="$0.01", network=network, pay_to=pay_to)
    def protected() -> object:
        return jsonify({"protected": True})

    flask_app.config["TESTING"] = True

    response = flask_app.test_client().get(
        "/protected",
        headers={"PAYMENT-SIGNATURE": valid_payment_header},
    )

    assert response.status_code == 502
    assert response.get_json()["error"] == "Failed to process payment with facilitator."
    assert len(fake_facilitator_sync.settle_calls) == 1
