"""FastAPI middleware tests for ``cdp_x402.middleware.fastapi``."""

from __future__ import annotations

import asyncio
import base64
import json

import pytest
from fastapi import Depends, FastAPI, Request, Response
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.testclient import TestClient
from pydantic import BaseModel
from x402.mechanisms.evm.exact import ExactEvmServerScheme
from x402.mechanisms.evm.upto import UptoEvmServerScheme
from x402.schemas import SettleResponse, VerifyResponse

from cdp_x402.middleware._common import SETTLEMENT_OVERRIDES_HEADER, VerifiedPayment
from cdp_x402.middleware.fastapi import CDPx402FastAPI
from tests.middleware.conftest import build_payment_signature_header


def _build_app(fake_facilitator_async, network: str, pay_to: str) -> tuple[FastAPI, CDPx402FastAPI]:
    ext = CDPx402FastAPI(facilitator_client=fake_facilitator_async)
    ext.register_scheme(network, ExactEvmServerScheme())

    app = FastAPI()
    ext.init_app(app)

    @app.get("/free")
    async def free() -> dict[str, bool]:
        return {"ok": True}

    @app.get("/protected")
    @ext.payment_required(price="$0.01", network=network, pay_to=pay_to)
    async def protected(request: Request, response: Response) -> dict[str, bool]:
        return {"protected": True}

    dep = ext.dependency(price="$0.01", network=network, pay_to=pay_to)
    dep_marker = Depends(dep)

    @app.get("/protected-dep")
    async def protected_dep(verified: VerifiedPayment = dep_marker) -> dict[str, str]:
        return {"payer": verified.payload.payload.get("signature", "")}

    return app, ext


@pytest.fixture
def app(fake_facilitator_async, network, pay_to) -> FastAPI:
    app_obj, _ext = _build_app(fake_facilitator_async, network, pay_to)
    return app_obj


def test_unprotected_route_returns_200(app: FastAPI) -> None:
    response = TestClient(app).get("/free")
    assert response.status_code == 200
    assert response.json() == {"ok": True}


def test_protected_route_without_payment_returns_402_with_header(app: FastAPI) -> None:
    response = TestClient(app).get("/protected")

    assert response.status_code == 402
    assert "payment-required" in response.headers, dict(response.headers)

    decoded = json.loads(base64.b64decode(response.headers["payment-required"]))
    assert decoded["x402Version"] == 2
    assert decoded["accepts"][0]["scheme"] == "exact"
    assert decoded["accepts"][0]["network"] == "eip155:8453"


def test_protected_route_with_valid_payment_settles_and_returns_200(
    app: FastAPI,
    valid_payment_header: str,
    fake_facilitator_async,
) -> None:
    response = TestClient(app).get(
        "/protected",
        headers={"PAYMENT-SIGNATURE": valid_payment_header},
    )

    assert response.status_code == 200
    assert response.json() == {"protected": True}
    assert "payment-response" in response.headers
    assert len(fake_facilitator_async.verify_calls) == 1
    assert len(fake_facilitator_async.settle_calls) == 1


def test_protected_route_with_invalid_payment_returns_402(
    app: FastAPI,
    valid_payment_header: str,
    fake_facilitator_async,
) -> None:
    fake_facilitator_async.next_verify = VerifyResponse(
        is_valid=False, invalid_reason="bad_signature"
    )

    response = TestClient(app).get(
        "/protected",
        headers={"PAYMENT-SIGNATURE": valid_payment_header},
    )

    assert response.status_code == 402
    assert "payment-required" in response.headers
    # The error reason is encoded in the PAYMENT-REQUIRED header per the x402 spec.
    decoded = json.loads(base64.b64decode(response.headers["payment-required"]))
    assert "bad_signature" in decoded.get("error", "")
    assert fake_facilitator_async.settle_calls == []


def test_protected_route_with_mismatched_requirements_returns_402_without_verification(
    app: FastAPI,
    pay_to: str,
    fake_facilitator_async,
) -> None:
    mismatched_header = build_payment_signature_header(price="$0.02", pay_to=pay_to)
    response = TestClient(app).get(
        "/protected",
        headers={"PAYMENT-SIGNATURE": mismatched_header},
    )

    assert response.status_code == 402
    assert "payment-required" in response.headers
    decoded = json.loads(base64.b64decode(response.headers["payment-required"]))
    assert "no matching payment" in decoded.get("error", "").lower()
    assert fake_facilitator_async.verify_calls == []
    assert fake_facilitator_async.settle_calls == []


def test_protected_route_with_malformed_payment_header_returns_402(app: FastAPI) -> None:
    response = TestClient(app).get(
        "/protected",
        headers={"PAYMENT-SIGNATURE": "!!!not-base64!!!"},
    )

    assert response.status_code == 402
    # Malformed headers are treated as absent; the server returns payment requirements.
    assert "payment-required" in response.headers


def test_protected_route_with_decodable_but_invalid_payment_payload_returns_402(
    app: FastAPI,
) -> None:
    malformed_but_decodable = base64.b64encode(b'{"x402Version":2}').decode()
    response = TestClient(app).get(
        "/protected",
        headers={"PAYMENT-SIGNATURE": malformed_but_decodable},
    )
    assert response.status_code == 402
    assert "payment-required" in response.headers


def test_v1_x_payment_header_is_also_accepted(app: FastAPI, valid_payment_header: str) -> None:
    response = TestClient(app).get(
        "/protected",
        headers={"X-PAYMENT": valid_payment_header},
    )
    assert response.status_code == 200
    assert "payment-response" in response.headers


def test_dependency_returns_402_without_payment(app: FastAPI) -> None:
    response = TestClient(app).get("/protected-dep")
    assert response.status_code == 402
    assert "payment-required" in response.headers


def test_dependency_returns_verified_payment_on_success(
    app: FastAPI, valid_payment_header: str, fake_facilitator_async
) -> None:
    response = TestClient(app).get(
        "/protected-dep",
        headers={"PAYMENT-SIGNATURE": valid_payment_header},
    )
    assert response.status_code == 200
    assert response.json() == {"payer": "0xdeadbeef"}
    # Dependency-based path does not auto-settle.
    assert fake_facilitator_async.settle_calls == []


def test_settlement_exception_returns_402(
    fake_facilitator_async,
    network: str,
    pay_to: str,
    valid_payment_header: str,
    caplog: pytest.LogCaptureFixture,
) -> None:
    fake_facilitator_async.settle_error = RuntimeError("facilitator unreachable")

    app_obj, _ext = _build_app(fake_facilitator_async, network, pay_to)

    import logging

    with caplog.at_level(logging.ERROR, logger="cdp_x402.middleware._common"):
        response = TestClient(app_obj).get(
            "/protected",
            headers={"PAYMENT-SIGNATURE": valid_payment_header},
        )

    assert response.status_code == 402
    assert response.json() == {}
    assert "payment-response" in response.headers
    assert len(fake_facilitator_async.settle_calls) == 1
    assert any("settlement" in r.message.lower() for r in caplog.records)


def test_settlement_failure_response_returns_402_with_payment_response_header(
    fake_facilitator_async,
    network: str,
    pay_to: str,
    valid_payment_header: str,
) -> None:
    fake_facilitator_async.next_settle = SettleResponse(
        success=False,
        transaction="0xtx",
        network=network,
        errorReason="settlement_failed",
        errorMessage="insufficient allowance",
    )
    app_obj, _ext = _build_app(fake_facilitator_async, network, pay_to)

    response = TestClient(app_obj).get(
        "/protected",
        headers={"PAYMENT-SIGNATURE": valid_payment_header},
    )

    assert response.status_code == 402
    assert response.json() == {}
    assert "payment-response" in response.headers
    assert len(fake_facilitator_async.settle_calls) == 1


def test_payment_required_supports_sync_handler(
    fake_facilitator_async,
    network: str,
    pay_to: str,
    valid_payment_header: str,
) -> None:
    ext = CDPx402FastAPI(facilitator_client=fake_facilitator_async)
    ext.register_scheme(network, ExactEvmServerScheme())
    app_obj = FastAPI()

    saw_running_loop = False

    @app_obj.get("/sync-protected")
    @ext.payment_required(price="$0.01", network=network, pay_to=pay_to)
    def sync_protected(request: Request, response: Response) -> dict[str, bool]:
        nonlocal saw_running_loop
        try:
            asyncio.get_running_loop()
            saw_running_loop = True
        except RuntimeError:
            saw_running_loop = False
        return {"protected": True}

    response = TestClient(app_obj).get(
        "/sync-protected",
        headers={"PAYMENT-SIGNATURE": valid_payment_header},
    )

    assert response.status_code == 200
    assert response.json() == {"protected": True}
    assert "payment-response" in response.headers
    assert saw_running_loop is False
    assert len(fake_facilitator_async.settle_calls) == 1


def test_route_level_non_2xx_status_does_not_settle(
    fake_facilitator_async,
    network: str,
    pay_to: str,
    valid_payment_header: str,
) -> None:
    ext = CDPx402FastAPI(facilitator_client=fake_facilitator_async)
    ext.register_scheme(network, ExactEvmServerScheme())
    app_obj = FastAPI()

    @app_obj.get("/route-level-status", status_code=404)
    @ext.payment_required(price="$0.01", network=network, pay_to=pay_to)
    async def route_level_status(_request: Request, _response: Response) -> dict[str, bool]:
        return {"protected": False}

    response = TestClient(app_obj).get(
        "/route-level-status",
        headers={"PAYMENT-SIGNATURE": valid_payment_header},
    )

    assert response.status_code == 404
    assert response.json() == {"protected": False}
    assert "payment-response" not in response.headers
    assert len(fake_facilitator_async.settle_calls) == 0


def test_streaming_response_failure_does_not_settle(
    fake_facilitator_async,
    network: str,
    pay_to: str,
    valid_payment_header: str,
) -> None:
    ext = CDPx402FastAPI(facilitator_client=fake_facilitator_async)
    ext.register_scheme(network, ExactEvmServerScheme())
    app_obj = FastAPI()

    @app_obj.get("/streaming-protected")
    @ext.payment_required(price="$0.01", network=network, pay_to=pay_to)
    async def streaming_protected(_request: Request, _response: Response) -> StreamingResponse:
        async def broken_stream():
            yield b"partial"
            raise RuntimeError("stream failed")

        return StreamingResponse(broken_stream(), media_type="text/plain")

    response = TestClient(app_obj, raise_server_exceptions=False).get(
        "/streaming-protected",
        headers={"PAYMENT-SIGNATURE": valid_payment_header},
    )

    assert response.status_code == 500
    assert len(fake_facilitator_async.settle_calls) == 0


def test_settlement_uses_explicit_response_returned_by_handler(
    fake_facilitator_async,
    network: str,
    pay_to: str,
    valid_payment_header: str,
) -> None:
    ext = CDPx402FastAPI(facilitator_client=fake_facilitator_async)
    ext.register_scheme(network, ExactEvmServerScheme())
    app_obj = FastAPI()

    @app_obj.get("/explicit-response")
    @ext.payment_required(price="$0.01", network=network, pay_to=pay_to)
    async def explicit_response(_request: Request, response: Response) -> JSONResponse:
        response.status_code = 200
        return JSONResponse(content={"protected": False}, status_code=404)

    settled = TestClient(app_obj).get(
        "/explicit-response",
        headers={"PAYMENT-SIGNATURE": valid_payment_header},
    )

    assert settled.status_code == 404
    assert settled.json() == {"protected": False}
    assert "payment-response" not in settled.headers
    assert len(fake_facilitator_async.settle_calls) == 0


def test_settlement_overrides_are_forwarded_and_not_leaked_in_response_headers(
    fake_facilitator_async,
    network: str,
    pay_to: str,
) -> None:
    ext = CDPx402FastAPI(facilitator_client=fake_facilitator_async)
    ext.register_scheme(network, UptoEvmServerScheme())
    app_obj = FastAPI()

    @app_obj.get("/upto-protected")
    @ext.payment_required(price="$0.10", network=network, pay_to=pay_to, scheme="upto")
    async def upto_protected(request: Request, response: Response) -> dict[str, bool]:
        response.headers[SETTLEMENT_OVERRIDES_HEADER] = '{"amount":"123"}'
        return {"protected": True}

    valid_upto_header = build_payment_signature_header(price="$0.10", pay_to=pay_to, scheme="upto")
    response = TestClient(app_obj).get(
        "/upto-protected",
        headers={"PAYMENT-SIGNATURE": valid_upto_header},
    )

    assert response.status_code == 200
    assert response.json() == {"protected": True}
    assert "payment-response" in response.headers
    assert "settlement-overrides" not in response.headers
    assert len(fake_facilitator_async.settle_calls) == 1
    _payload, requirements = fake_facilitator_async.settle_calls[0]
    assert requirements.amount == "123"


def test_handler_without_response_param_raises_runtime_error(
    fake_facilitator_async,
    network: str,
    pay_to: str,
    valid_payment_header: str,
) -> None:
    ext = CDPx402FastAPI(facilitator_client=fake_facilitator_async)
    ext.register_scheme(network, ExactEvmServerScheme())
    app_obj = FastAPI()

    @app_obj.get("/no-response-param")
    @ext.payment_required(price="$0.01", network=network, pay_to=pay_to)
    async def no_response_param(request: Request) -> dict[str, bool]:
        return {"protected": True}

    with pytest.raises(RuntimeError, match="requires the route handler"):
        TestClient(app_obj).get(
            "/no-response-param",
            headers={"PAYMENT-SIGNATURE": valid_payment_header},
        )

    assert len(fake_facilitator_async.settle_calls) == 0


def test_response_model_is_preserved_with_payment_required(
    fake_facilitator_async,
    network: str,
    pay_to: str,
    valid_payment_header: str,
) -> None:
    class ProtectedResponse(BaseModel):
        protected: bool

    ext = CDPx402FastAPI(facilitator_client=fake_facilitator_async)
    ext.register_scheme(network, ExactEvmServerScheme())
    app_obj = FastAPI()

    @app_obj.get("/response-model-protected", response_model=ProtectedResponse)
    @ext.payment_required(price="$0.01", network=network, pay_to=pay_to)
    async def response_model_protected(request: Request, response: Response) -> dict[str, object]:
        return {"protected": True, "internalOnly": "should-be-filtered"}

    result = TestClient(app_obj).get(
        "/response-model-protected",
        headers={"PAYMENT-SIGNATURE": valid_payment_header},
    )

    assert result.status_code == 200
    assert result.json() == {"protected": True}
    assert "payment-response" in result.headers
    assert len(fake_facilitator_async.settle_calls) == 1


def test_facilitator_error_during_verify_returns_502(
    fake_facilitator_async,
    network: str,
    pay_to: str,
    valid_payment_header: str,
) -> None:
    from x402.http.facilitator_client_base import FacilitatorResponseError

    fake_facilitator_async.verify_error = FacilitatorResponseError("malformed facilitator response")

    app_obj, _ext = _build_app(fake_facilitator_async, network, pay_to)

    response = TestClient(app_obj).get(
        "/protected",
        headers={"PAYMENT-SIGNATURE": valid_payment_header},
    )

    assert response.status_code == 502
    assert response.json()["error"] == "Failed to process payment with facilitator."


def test_facilitator_error_during_settle_returns_502(
    fake_facilitator_async,
    network: str,
    pay_to: str,
    valid_payment_header: str,
) -> None:
    from x402.http.facilitator_client_base import FacilitatorResponseError

    fake_facilitator_async.settle_error = FacilitatorResponseError("facilitator schema error")

    app_obj, _ext = _build_app(fake_facilitator_async, network, pay_to)

    response = TestClient(app_obj).get(
        "/protected",
        headers={"PAYMENT-SIGNATURE": valid_payment_header},
    )

    assert response.status_code == 502
    assert response.json()["error"] == "Failed to process payment with facilitator."
    assert len(fake_facilitator_async.settle_calls) == 1
