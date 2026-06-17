"""FastAPI integration for cdp.x402."""

from __future__ import annotations

import logging
from collections.abc import Awaitable, Callable
from functools import wraps
from inspect import isawaitable, iscoroutinefunction
from typing import TYPE_CHECKING, Any

from x402.http.middleware.fastapi import (  # noqa: F401
    FastAPIAdapter,
    PaymentMiddlewareASGI,
    payment_middleware_from_config,
    set_settlement_overrides,
)
from x402.http.middleware.fastapi import (
    payment_middleware as payment_middleware_from_server,
)
from x402.http.types import RESULT_PAYMENT_VERIFIED

from cdp.x402.middleware._common import (
    ACCESS_CONTROL_EXPOSE_HEADERS,
    PAYMENT_REQUIRED_HEADER,
    PAYMENT_RESPONSE_HEADER,
    PAYMENT_SIGNATURE_HEADER,
    X_PAYMENT_HEADER,
    AsyncPaymentGate,
    FacilitatorResponseError,
    RouteSpec,
    VerifiedPayment,
    extract_settlement_overrides,
    get_default_scheme_registrations,
    strip_settlement_overrides_header,
)

if TYPE_CHECKING:
    from fastapi import FastAPI

_log = logging.getLogger(__name__)
_FACILITATOR_ERROR_MESSAGE = "Failed to process payment with facilitator."


def _require_fastapi() -> Any:
    try:
        import fastapi
    except ImportError as exc:
        raise ImportError(
            "The FastAPI integration requires the `fastapi` package. "
            "Install with: pip install 'cdp-sdk[x402-fastapi]'"
        ) from exc
    return fastapi


class StarletteRequestAdapter:
    """CDP-extended adapter for FastAPI/Starlette requests."""

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
        return str(self._request.url.path)

    def get_url(self) -> str:
        return str(self._request.url)

    def get_accept_header(self) -> str:
        return str(self._request.headers.get("accept", ""))

    def get_user_agent(self) -> str:
        return str(self._request.headers.get("user-agent", ""))

    def get_query_params(self) -> dict[str, str | list[str]] | None:
        return dict(self._request.query_params)

    def get_query_param(self, name: str) -> str | list[str] | None:
        return self._request.query_params.get(name)  # type: ignore[no-any-return]

    def get_body(self) -> Any:
        return None


class CDPx402FastAPI:
    """FastAPI extension that protects routes via the CDP x402 facilitator."""

    def __init__(
        self,
        *,
        facilitator_client: Any | None = None,
        api_key_id: str | None = None,
        api_key_secret: str | None = None,
    ) -> None:
        if facilitator_client is None:
            from cdp.x402.core import create_cdp_facilitator_client

            facilitator_client = create_cdp_facilitator_client(api_key_id, api_key_secret)
        self._gate = AsyncPaymentGate(facilitator_client)

    def register_scheme(self, network: str, scheme_server: Any) -> None:
        self._gate.register_scheme(network, scheme_server)

    def register_extension(self, extension: Any) -> None:
        self._gate.register_extension(extension)

    def init_app(self, app: FastAPI) -> None:
        state = getattr(app, "state", None)
        if state is not None:
            state.cdp_x402 = self

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
    ) -> Callable[[Callable[..., Awaitable[Any]]], Callable[..., Awaitable[Any]]]:
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

        def decorator(view: Callable[..., Awaitable[Any]]) -> Callable[..., Awaitable[Any]]:
            fastapi = _require_fastapi()

            @wraps(view)
            async def wrapper(*args: Any, **kwargs: Any) -> Any:
                request = _extract_request(args, kwargs, fastapi)
                if request is None:
                    raise RuntimeError(
                        "payment_required requires the route handler to accept a "
                        "fastapi.Request parameter (declare `request: Request`)."
                    )
                response_target = _extract_response_target(args, kwargs, fastapi)

                adapter = StarletteRequestAdapter(request)
                try:
                    result = await self._gate.process_request(spec, adapter)
                except FacilitatorResponseError as exc:
                    return _facilitator_error_response(fastapi, exc)

                if result.type != RESULT_PAYMENT_VERIFIED:
                    return _instructions_to_fastapi_response(fastapi, result.response)

                if iscoroutinefunction(view):
                    handler_result = await view(*args, **kwargs)
                else:
                    handler_result = await _run_sync_in_threadpool(view, *args, **kwargs)
                    if isawaitable(handler_result):
                        handler_result = await handler_result
                returned_response = _response_from_value(handler_result, fastapi)
                response = returned_response or response_target
                if response is None:
                    raise RuntimeError(
                        "payment_required requires the route handler to either return "
                        "a fastapi.Response or accept a fastapi.Response parameter "
                        "to attach settlement headers."
                    )
                if returned_response is not None:
                    response = await _buffer_streaming_response(response, fastapi)
                status_code = _effective_status_code(
                    request=request,
                    response=response,
                    returned_response=returned_response,
                )
                if 200 <= status_code < 300:
                    settlement_overrides = extract_settlement_overrides(response.headers)
                    strip_settlement_overrides_header(response.headers)
                    try:
                        headers, settle_result = await self._gate.settle_payment(
                            result,
                            settlement_overrides=settlement_overrides,
                        )
                    except FacilitatorResponseError as exc:
                        return _facilitator_error_response(fastapi, exc)
                    if not settle_result.success:
                        _log.warning("x402 settlement failed; returning 402.")
                        return _settlement_failure_response(fastapi, headers)
                    else:
                        _merge_headers(response, headers)
                if returned_response is not None:
                    return response
                return handler_result

            return wrapper

        return decorator

    def dependency(
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
    ) -> Callable[..., Awaitable[VerifiedPayment]]:
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
        fastapi = _require_fastapi()

        async def _dep(request: Any) -> VerifiedPayment:
            adapter = StarletteRequestAdapter(request)
            try:
                result = await self._gate.process_request(spec, adapter)
            except FacilitatorResponseError as exc:
                _log.warning("x402 facilitator error in dependency: %s", exc)
                raise fastapi.HTTPException(
                    status_code=502,
                    detail={"error": _FACILITATOR_ERROR_MESSAGE},
                ) from exc
            if result.type != RESULT_PAYMENT_VERIFIED:
                instructions = result.response
                if instructions is None:
                    raise fastapi.HTTPException(
                        status_code=402, detail={"error": "Payment required"}
                    )
                raise fastapi.HTTPException(
                    status_code=instructions.status,
                    detail=instructions.body,
                    headers=instructions.headers,
                )
            assert result.payment_payload is not None
            assert result.payment_requirements is not None
            return VerifiedPayment(
                payload=result.payment_payload,
                requirements=result.payment_requirements,
            )

        _dep.__annotations__ = {"request": fastapi.Request, "return": VerifiedPayment}
        return _dep


def payment_middleware(
    routes: Any,
    *,
    facilitator_client: Any | None = None,
    api_key_id: str | None = None,
    api_key_secret: str | None = None,
    schemes: list[dict[str, Any]] | None = None,
    paywall_config: Any | None = None,
    paywall_provider: Any | None = None,
    sync_facilitator_on_start: bool = True,
) -> Any:
    """Build the upstream x402 FastAPI middleware with CDP defaults."""
    _require_fastapi()
    if facilitator_client is None:
        from cdp.x402.core import create_cdp_facilitator_client

        facilitator_client = create_cdp_facilitator_client(api_key_id, api_key_secret)
    resolved_schemes = schemes if schemes is not None else get_default_scheme_registrations()

    return payment_middleware_from_config(
        routes=routes,
        facilitator_client=facilitator_client,
        schemes=resolved_schemes,
        paywall_config=paywall_config,
        paywall_provider=paywall_provider,
        sync_facilitator_on_start=sync_facilitator_on_start,
    )


def _extract_request(args: tuple[Any, ...], kwargs: dict[str, Any], fastapi: Any) -> Any | None:
    Request = fastapi.Request
    for a in args:
        if isinstance(a, Request):
            return a
    for v in kwargs.values():
        if isinstance(v, Request):
            return v
    return None


def _extract_response_target(
    args: tuple[Any, ...],
    kwargs: dict[str, Any],
    fastapi: Any,
) -> Any | None:
    Response = fastapi.Response
    for a in args:
        if isinstance(a, Response):
            return a
    for v in kwargs.values():
        if isinstance(v, Response):
            return v
    return None


def _response_from_value(value: Any, fastapi: Any) -> Any | None:
    return value if isinstance(value, fastapi.Response) else None


def _status_code_or_default(response: Any) -> int:
    status_code = getattr(response, "status_code", None)
    return int(status_code) if status_code is not None else 200


def _route_status_code(request: Any) -> int | None:
    route = request.scope.get("route")
    status_code = getattr(route, "status_code", None)
    return int(status_code) if status_code is not None else None


def _effective_status_code(*, request: Any, response: Any, returned_response: Any | None) -> int:
    if returned_response is not None:
        return _status_code_or_default(response)
    explicit_status = getattr(response, "status_code", None)
    if explicit_status is not None:
        return int(explicit_status)
    route_status = _route_status_code(request)
    return route_status if route_status is not None else 200


async def _run_sync_in_threadpool(view: Callable[..., Any], *args: Any, **kwargs: Any) -> Any:
    try:
        from starlette.concurrency import run_in_threadpool
    except ImportError as exc:
        raise RuntimeError("FastAPI sync handlers require Starlette threadpool support.") from exc
    return await run_in_threadpool(view, *args, **kwargs)


async def _buffer_streaming_response(response: Any, fastapi: Any) -> Any:
    body_iterator = getattr(response, "body_iterator", None)
    if body_iterator is None:
        return response
    body = b""
    async for chunk in body_iterator:
        body += chunk
    return fastapi.Response(
        content=body,
        status_code=response.status_code,
        headers=dict(response.headers),
        media_type=response.media_type,
    )


def _merge_headers(response: Any, headers: dict[str, str]) -> None:
    for k, v in headers.items():
        if k.lower() == "access-control-expose-headers":
            existing = response.headers.get(k)
            response.headers[k] = f"{existing}, {v}" if existing else v
        else:
            response.headers[k] = v


def _instructions_to_fastapi_response(fastapi: Any, instructions: Any) -> Any:
    body = instructions.body
    if instructions.is_html:
        response = fastapi.Response(
            content=body if isinstance(body, (str, bytes)) else str(body),
            status_code=instructions.status,
            media_type=instructions.headers.get("Content-Type", "text/html"),
        )
    else:
        response = fastapi.responses.JSONResponse(
            content=body if not isinstance(body, (str, bytes)) else {},
            status_code=instructions.status,
        )
    for k, v in instructions.headers.items():
        if k.lower() == "content-type":
            continue
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


def _facilitator_error_response(fastapi: Any, error: FacilitatorResponseError) -> Any:
    _log.warning("x402 facilitator response error during payment flow: %s", error)
    return fastapi.responses.JSONResponse(
        content={"error": _FACILITATOR_ERROR_MESSAGE},
        status_code=502,
    )


def _settlement_failure_response(fastapi: Any, headers: dict[str, str] | None = None) -> Any:
    response = fastapi.responses.JSONResponse(content={}, status_code=402)
    if headers:
        _merge_headers(response, headers)
    return response


__all__ = [
    "CDPx402FastAPI",
    "StarletteRequestAdapter",
    "payment_middleware",
    "FastAPIAdapter",
    "PaymentMiddlewareASGI",
    "payment_middleware_from_config",
    "payment_middleware_from_server",
    "set_settlement_overrides",
]
