"""Flask integration for cdp.x402."""

from __future__ import annotations

import json
import logging
from collections.abc import Callable
from functools import wraps
from typing import TYPE_CHECKING, Any

from x402.http.middleware.flask import (  # noqa: F401
    FlaskAdapter,
    PaymentMiddleware,
    payment_middleware_from_config,
    set_settlement_overrides,
)
from x402.http.middleware.flask import (
    payment_middleware as payment_middleware_from_server,
)
from x402.http.types import RESULT_PAYMENT_VERIFIED

from cdp.x402.middleware._common import (
    ACCESS_CONTROL_EXPOSE_HEADERS,
    PAYMENT_REQUIRED_HEADER,
    PAYMENT_RESPONSE_HEADER,
    PAYMENT_SIGNATURE_HEADER,
    X_PAYMENT_HEADER,
    FacilitatorResponseError,
    RouteSpec,
    SyncPaymentGate,
    extract_settlement_overrides,
    get_default_scheme_registrations,
    strip_settlement_overrides_header,
)

if TYPE_CHECKING:
    from flask import Flask

_log = logging.getLogger(__name__)
_FACILITATOR_ERROR_MESSAGE = "Failed to process payment with facilitator."


def _require_flask() -> Any:
    try:
        import flask
    except ImportError as exc:
        raise ImportError(
            "The Flask integration requires the `flask` package. "
            "Install with: pip install 'cdp-sdk[x402-flask]'"
        ) from exc
    return flask


class FlaskRequestAdapter:
    """CDP-extended adapter for Flask requests."""

    def __init__(self, request: Any) -> None:
        self._request = request

    def get_header(self, name: str) -> str | None:
        value = self._request.headers.get(name)
        if value is None and name.upper() == PAYMENT_SIGNATURE_HEADER:
            value = self._request.headers.get(X_PAYMENT_HEADER)
        return str(value) if value is not None else None

    def get_method(self) -> str:
        return str(self._request.method)

    def get_path(self) -> str:
        return str(self._request.path)

    def get_url(self) -> str:
        return str(self._request.url)

    def get_accept_header(self) -> str:
        return str(self._request.headers.get("Accept", ""))

    def get_user_agent(self) -> str:
        return str(self._request.headers.get("User-Agent", ""))

    def get_query_params(self) -> dict[str, str | list[str]] | None:
        return dict(self._request.args)

    def get_query_param(self, name: str) -> str | list[str] | None:
        return self._request.args.get(name)  # type: ignore[no-any-return]

    def get_body(self) -> Any:
        return self._request.get_json(silent=True)


class CDPx402Flask:
    """Flask extension that protects routes via the CDP x402 facilitator."""

    def __init__(
        self,
        app: Flask | None = None,
        *,
        facilitator_client: Any | None = None,
        api_key_id: str | None = None,
        api_key_secret: str | None = None,
    ) -> None:
        if facilitator_client is None:
            from cdp.x402.core import create_cdp_facilitator_client_sync

            facilitator_client = create_cdp_facilitator_client_sync(api_key_id, api_key_secret)
        self._gate = SyncPaymentGate(facilitator_client)
        if app is not None:
            self.init_app(app)

    def register_scheme(self, network: str, scheme_server: Any) -> None:
        self._gate.register_scheme(network, scheme_server)

    def register_extension(self, extension: Any) -> None:
        self._gate.register_extension(extension)

    def init_app(self, app: Flask) -> None:
        app.extensions = getattr(app, "extensions", {})
        app.extensions["cdp_x402"] = self

    def payment_required(
        self,
        *,
        price: str | int,
        network: str,
        pay_to: str,
        scheme: str = "exact",
        description: str | None = None,
        mime_type: str | None = None,
        extensions: dict[str, Any] | None = None,
        max_timeout_seconds: int = 300,
        extra: dict[str, Any] | None = None,
    ) -> Callable[[Callable[..., Any]], Callable[..., Any]]:
        spec = RouteSpec(
            price=price,
            network=network,
            pay_to=pay_to,
            scheme=scheme,
            description=description,
            mime_type=mime_type,
            extensions=extensions,
            max_timeout_seconds=max_timeout_seconds,
            extra=extra or {},
        )

        def decorator(view: Callable[..., Any]) -> Callable[..., Any]:
            flask = _require_flask()

            @wraps(view)
            def wrapper(*args: Any, **kwargs: Any) -> Any:
                adapter = FlaskRequestAdapter(flask.request)
                try:
                    result = self._gate.process_request(spec, adapter)
                except FacilitatorResponseError as exc:
                    return _facilitator_error_response(flask, exc)

                if result.type != RESULT_PAYMENT_VERIFIED:
                    return _instructions_to_flask_response(flask, result.response)

                response = flask.make_response(view(*args, **kwargs))
                if 200 <= response.status_code < 300:
                    response.get_data()
                    settlement_overrides = extract_settlement_overrides(response.headers)
                    strip_settlement_overrides_header(response.headers)
                    try:
                        headers, settle_result = self._gate.settle_payment(
                            result,
                            settlement_overrides=settlement_overrides,
                        )
                    except FacilitatorResponseError as exc:
                        return _facilitator_error_response(flask, exc)
                    if not settle_result.success:
                        _log.warning("x402 settlement failed; returning 402.")
                        return _settlement_failure_response(flask, headers)
                    else:
                        for k, v in headers.items():
                            if k.lower() == "access-control-expose-headers":
                                existing = response.headers.get(k)
                                response.headers[k] = f"{existing}, {v}" if existing else v
                            else:
                                response.headers[k] = v
                return response

            return wrapper

        return decorator


def payment_middleware(
    app: Flask,
    routes: Any,
    *,
    facilitator_client: Any | None = None,
    api_key_id: str | None = None,
    api_key_secret: str | None = None,
    schemes: list[dict[str, Any]] | None = None,
    paywall_config: Any | None = None,
    paywall_provider: Any | None = None,
    sync_facilitator_on_start: bool = True,
) -> PaymentMiddleware:
    """Create a :class:`~x402.http.middleware.flask.PaymentMiddleware` with CDP defaults."""
    _require_flask()
    from x402.server import x402ResourceServerSync

    if facilitator_client is None:
        from cdp.x402.core import create_cdp_facilitator_client_sync

        facilitator_client = create_cdp_facilitator_client_sync(api_key_id, api_key_secret)
    resolved_schemes = schemes if schemes is not None else get_default_scheme_registrations()
    server = x402ResourceServerSync(facilitator_client)
    for registration in resolved_schemes:
        server.register(registration["network"], registration["server"])

    return PaymentMiddleware(
        app,
        routes,
        server,
        paywall_config,
        paywall_provider,
        sync_facilitator_on_start,
    )


def _instructions_to_flask_response(flask_mod: Any, instructions: Any) -> Any:
    body = instructions.body
    if not instructions.is_html and not isinstance(body, (str, bytes)):
        body = json.dumps(body)
    response = flask_mod.make_response((body, instructions.status))
    for k, v in instructions.headers.items():
        response.headers[k] = v
    exposed = [
        h for h in (PAYMENT_REQUIRED_HEADER, PAYMENT_RESPONSE_HEADER) if h in response.headers
    ]
    if exposed:
        existing = response.headers.get(ACCESS_CONTROL_EXPOSE_HEADERS)
        value = ", ".join(exposed)
        response.headers[ACCESS_CONTROL_EXPOSE_HEADERS] = (
            f"{existing}, {value}" if existing else value
        )
    return response


def _facilitator_error_response(flask_mod: Any, error: FacilitatorResponseError) -> Any:
    _log.warning("x402 facilitator response error during payment flow: %s", error)
    return flask_mod.make_response(
        (
            json.dumps({"error": _FACILITATOR_ERROR_MESSAGE}),
            502,
            {"Content-Type": "application/json"},
        )
    )


def _settlement_failure_response(flask_mod: Any, headers: dict[str, str] | None = None) -> Any:
    response = flask_mod.make_response((json.dumps({}), 402, {"Content-Type": "application/json"}))
    if headers:
        for k, v in headers.items():
            if k.lower() == "access-control-expose-headers":
                existing = response.headers.get(k)
                response.headers[k] = f"{existing}, {v}" if existing else v
            else:
                response.headers[k] = v
    return response


__all__ = [
    "CDPx402Flask",
    "FlaskRequestAdapter",
    "payment_middleware",
    "FlaskAdapter",
    "PaymentMiddleware",
    "payment_middleware_from_config",
    "payment_middleware_from_server",
    "set_settlement_overrides",
]
