"""Framework-agnostic helpers shared by the Flask and FastAPI middleware."""

from __future__ import annotations

import asyncio
import json
import logging
import threading
from collections.abc import Mapping, MutableMapping
from dataclasses import dataclass, field
from typing import TYPE_CHECKING, Any, cast

from pydantic import ConfigDict
from pydantic.dataclasses import dataclass as pydantic_dataclass

from x402.http import (
    PAYMENT_REQUIRED_HEADER,
    PAYMENT_RESPONSE_HEADER,
    PAYMENT_SIGNATURE_HEADER,
    X_PAYMENT_HEADER,
    HTTPProcessResult,
    HTTPRequestContext,
    x402HTTPResourceServer,
    x402HTTPResourceServerSync,
)
from x402.http.constants import SETTLEMENT_OVERRIDES_HEADER
from x402.http.facilitator_client_base import FacilitatorResponseError
from x402.http.types import RESULT_PAYMENT_VERIFIED
from x402.http.utils import encode_payment_response_header

if TYPE_CHECKING:
    from x402.http import HTTPAdapter
    from x402.schemas import PaymentPayload, PaymentRequirements, SettleResponse
    from x402.server import FacilitatorClient, FacilitatorClientSync

ACCESS_CONTROL_EXPOSE_HEADERS = "Access-Control-Expose-Headers"

_log = logging.getLogger(__name__)


@pydantic_dataclass(config=ConfigDict(arbitrary_types_allowed=True, extra="forbid"))
class RouteSpec:
    """Per-route payment requirements supplied via the decorator API."""

    price: str | int
    network: str
    pay_to: str
    scheme: str = "exact"
    description: str | None = None
    mime_type: str | None = None
    extensions: dict[str, Any] | None = None
    max_timeout_seconds: int = 300
    extra: dict[str, Any] = field(default_factory=dict)


@dataclass
class VerifiedPayment:
    """A verified payment ready for settlement after the handler runs."""

    payload: PaymentPayload
    requirements: PaymentRequirements


def _spec_to_route_config(spec: RouteSpec) -> Any:
    from x402.http import PaymentOption, RouteConfig

    return RouteConfig(
        accepts=PaymentOption(
            scheme=spec.scheme,
            pay_to=spec.pay_to,
            price=spec.price,
            network=spec.network,
            max_timeout_seconds=spec.max_timeout_seconds,
            extra=spec.extra or None,
        ),
        description=spec.description,
        mime_type=spec.mime_type,
        extensions=spec.extensions,
    )


def _spec_cache_key(spec: RouteSpec) -> tuple[str, str, str, str, int]:
    return (spec.scheme, spec.network, spec.pay_to, str(spec.price), spec.max_timeout_seconds)


def read_payment_header(get_header: Any) -> str | None:
    value = get_header(PAYMENT_SIGNATURE_HEADER) or get_header(X_PAYMENT_HEADER)
    return value if value is None else str(value)


def extract_settlement_overrides(
    response_headers: Mapping[str, Any] | list[tuple[str, str]] | None,
) -> dict[str, Any] | None:
    if response_headers is None:
        return None

    key = SETTLEMENT_OVERRIDES_HEADER.lower()
    raw: str | None = None
    if isinstance(response_headers, Mapping):
        for k, v in response_headers.items():
            if str(k).lower() == key:
                raw = str(v)
                break
    else:
        for k, v in response_headers:
            if str(k).lower() == key:
                raw = str(v)
                break

    if raw is None:
        return None

    try:
        parsed = json.loads(raw)
        return cast(dict[str, Any], parsed)
    except (json.JSONDecodeError, TypeError):
        return None


def strip_settlement_overrides_header(headers: MutableMapping[str, Any]) -> None:
    key = SETTLEMENT_OVERRIDES_HEADER.lower()
    for header_name in list(headers.keys()):
        if str(header_name).lower() == key:
            del headers[header_name]


class _ServerLifecycleMixin:
    def __init__(self) -> None:
        self._scheme_registrations: list[tuple[str, Any]] = []
        self._extensions: list[Any] = []
        self._init_lock = threading.Lock()
        self._initialized = False

    def register_scheme(self, network: str, scheme_server: Any) -> None:
        if self._initialized:
            raise RuntimeError(
                "Cannot register schemes after the resource server has been initialized."
            )
        self._scheme_registrations.append((network, scheme_server))

    def register_extension(self, extension: Any) -> None:
        if self._initialized:
            raise RuntimeError(
                "Cannot register extensions after the resource server has been initialized."
            )
        self._extensions.append(extension)


class SyncPaymentGate(_ServerLifecycleMixin):
    """Sync payment gate built on :class:`x402.http.x402HTTPResourceServerSync`."""

    def __init__(self, facilitator_client: FacilitatorClientSync) -> None:
        super().__init__()
        from x402.server import x402ResourceServerSync

        self._core_server: x402ResourceServerSync = x402ResourceServerSync(facilitator_client)
        self._http_servers: dict[tuple[str, str, str, str, int], x402HTTPResourceServerSync] = {}
        self._http_server_lock = threading.Lock()

    def _ensure_initialized(self) -> None:
        if self._initialized:
            return
        with self._init_lock:
            if self._initialized:
                return
            for network, scheme_server in self._scheme_registrations:
                self._core_server.register(network, scheme_server)
            for extension in self._extensions:
                self._core_server.register_extension(extension)
            self._core_server.initialize()
            self._initialized = True

    def _get_http_server(self, spec: RouteSpec) -> x402HTTPResourceServerSync:
        key = _spec_cache_key(spec)
        if key in self._http_servers:
            return self._http_servers[key]
        with self._http_server_lock:
            if key not in self._http_servers:
                self._http_servers[key] = x402HTTPResourceServerSync(
                    self._core_server, {"*": _spec_to_route_config(spec)}
                )
        return self._http_servers[key]

    def process_request(self, spec: RouteSpec, adapter: HTTPAdapter) -> HTTPProcessResult:
        self._ensure_initialized()
        context = HTTPRequestContext(
            adapter=adapter,
            path=adapter.get_path(),
            method=adapter.get_method(),
        )
        return self._get_http_server(spec).process_http_request(context)

    def settle_payment(
        self,
        result: HTTPProcessResult,
        settlement_overrides: dict[str, Any] | None = None,
    ) -> tuple[dict[str, str], SettleResponse]:
        assert result.type == RESULT_PAYMENT_VERIFIED
        assert result.payment_payload is not None
        assert result.payment_requirements is not None
        requirements = result.payment_requirements
        if settlement_overrides is not None and "amount" in settlement_overrides:
            requirements = requirements.model_copy(
                update={"amount": str(settlement_overrides["amount"])}
            )
        try:
            settle_result = self._core_server.settle_payment(result.payment_payload, requirements)
        except FacilitatorResponseError:
            raise
        except Exception as exc:
            _log.exception("Unexpected error during payment settlement")
            from x402.schemas import SettleResponse

            settle_result = SettleResponse(
                success=False,
                error_reason=str(exc),
                error_message=str(exc),
                transaction="",
                network=requirements.network,
            )
        headers = {
            PAYMENT_RESPONSE_HEADER: encode_payment_response_header(settle_result),
            ACCESS_CONTROL_EXPOSE_HEADERS: PAYMENT_RESPONSE_HEADER,
        }
        return headers, settle_result


class AsyncPaymentGate(_ServerLifecycleMixin):
    """Async payment gate built on :class:`x402.http.x402HTTPResourceServer`."""

    def __init__(self, facilitator_client: FacilitatorClient) -> None:
        super().__init__()
        from x402.server import x402ResourceServer

        self._core_server: x402ResourceServer = x402ResourceServer(facilitator_client)
        self._http_servers: dict[tuple[str, str, str, str, int], x402HTTPResourceServer] = {}
        self._async_lock: asyncio.Lock = asyncio.Lock()
        self._http_server_lock: asyncio.Lock = asyncio.Lock()

    async def _ensure_initialized(self) -> None:
        if self._initialized:
            return
        async with self._async_lock:
            if self._initialized:
                return
            for network, scheme_server in self._scheme_registrations:
                self._core_server.register(network, scheme_server)
            for extension in self._extensions:
                self._core_server.register_extension(extension)
            self._core_server.initialize()
            self._initialized = True

    async def _get_http_server(self, spec: RouteSpec) -> x402HTTPResourceServer:
        key = _spec_cache_key(spec)
        if key in self._http_servers:
            return self._http_servers[key]
        async with self._http_server_lock:
            if key not in self._http_servers:
                self._http_servers[key] = x402HTTPResourceServer(
                    self._core_server, {"*": _spec_to_route_config(spec)}
                )
        return self._http_servers[key]

    async def process_request(self, spec: RouteSpec, adapter: HTTPAdapter) -> HTTPProcessResult:
        await self._ensure_initialized()
        context = HTTPRequestContext(
            adapter=adapter,
            path=adapter.get_path(),
            method=adapter.get_method(),
        )
        return await (await self._get_http_server(spec)).process_http_request(context)

    async def settle_payment(
        self,
        result: HTTPProcessResult,
        settlement_overrides: dict[str, Any] | None = None,
    ) -> tuple[dict[str, str], SettleResponse]:
        assert result.type == RESULT_PAYMENT_VERIFIED
        assert result.payment_payload is not None
        assert result.payment_requirements is not None
        requirements = result.payment_requirements
        if settlement_overrides is not None and "amount" in settlement_overrides:
            requirements = requirements.model_copy(
                update={"amount": str(settlement_overrides["amount"])}
            )
        try:
            settle_result = await self._core_server.settle_payment(
                result.payment_payload, requirements
            )
        except FacilitatorResponseError:
            raise
        except Exception as exc:
            _log.exception("Unexpected error during payment settlement")
            from x402.schemas import SettleResponse

            settle_result = SettleResponse(
                success=False,
                error_reason=str(exc),
                error_message=str(exc),
                transaction="",
                network=requirements.network,
            )
        headers = {
            PAYMENT_RESPONSE_HEADER: encode_payment_response_header(settle_result),
            ACCESS_CONTROL_EXPOSE_HEADERS: PAYMENT_RESPONSE_HEADER,
        }
        return headers, settle_result


def normalize_headers(headers: Mapping[str, Any]) -> dict[str, str]:
    return {str(k): str(v) for k, v in headers.items()}


def get_default_scheme_registrations() -> list[dict[str, Any]]:
    try:
        from x402.mechanisms.evm.exact import ExactEvmServerScheme
        from x402.mechanisms.evm.upto import UptoEvmServerScheme
        from x402.mechanisms.svm.exact import ExactSvmServerScheme
    except ImportError as exc:
        raise ImportError(
            "Default scheme registration requires x402 mechanisms. "
            "Install with: pip install 'cdp-sdk[x402-fastapi]' or 'cdp-sdk[x402-flask]'."
        ) from exc

    return [
        {"network": "eip155:*", "server": ExactEvmServerScheme()},  # type: ignore[no-untyped-call]
        {"network": "eip155:*", "server": UptoEvmServerScheme()},  # type: ignore[no-untyped-call]
        {"network": "solana:*", "server": ExactSvmServerScheme()},  # type: ignore[no-untyped-call]
    ]


__all__ = [
    "ACCESS_CONTROL_EXPOSE_HEADERS",
    "AsyncPaymentGate",
    "FacilitatorResponseError",
    "extract_settlement_overrides",
    "get_default_scheme_registrations",
    "PAYMENT_REQUIRED_HEADER",
    "PAYMENT_RESPONSE_HEADER",
    "PAYMENT_SIGNATURE_HEADER",
    "RouteSpec",
    "SETTLEMENT_OVERRIDES_HEADER",
    "SyncPaymentGate",
    "VerifiedPayment",
    "X_PAYMENT_HEADER",
    "normalize_headers",
    "read_payment_header",
    "strip_settlement_overrides_header",
]
