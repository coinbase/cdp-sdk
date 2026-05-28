"""
CDP Bazaar client for discovering and searching x402-gated resources.

Types are sourced from cdp-sdk (generated from the OpenAPI spec). The HTTP
layer uses httpx directly to avoid strict Pydantic validators in the generated
Python API client that can fail on real API data (e.g. new enum values, asset
address formats that post-date the SDK generation).

The CDP Bazaar endpoints are unauthenticated — only a Correlation-Context
header is required; no CDP API key credentials are needed.
"""

from __future__ import annotations

from typing import Any

import httpx
from cdp.openapi_client.models import (
    X402DiscoveryMerchantResponse,
    X402DiscoveryResource,
    X402DiscoveryResourcesResponse,
    X402PaymentRequirements,
    X402ResourceQuality,
    X402SearchResourcesResponse,
    X402V1PaymentRequirements,
    X402V2PaymentRequirements,
)
from pydantic import ConfigDict
from pydantic.dataclasses import dataclass

from cdp_x402.core.constants import CDP_FACILITATOR_URL, SDK_CORRELATION_CONTEXT

__all__ = [
    "X402DiscoveryResource",
    "X402DiscoveryResourcesResponse",
    "X402DiscoveryMerchantResponse",
    "X402ResourceQuality",
    "X402SearchResourcesResponse",
    "ListDiscoveryResourcesParams",
    "SearchDiscoveryResourcesParams",
    "MerchantResourcesParams",
    "CdpBazaarClient",
    "create_cdp_bazaar_client",
]

_CORRELATION_CONTEXT = SDK_CORRELATION_CONTEXT

_DISCOVERY_RESOURCES_PATH = "/discovery/resources"
_DISCOVERY_SEARCH_PATH = "/discovery/search"
_DISCOVERY_MERCHANT_PATH = "/discovery/merchant"
_QueryParamValue = str | int | float | bool | None


@dataclass(config=ConfigDict(extra="forbid"))
class ListDiscoveryResourcesParams:
    """Optional filtering and pagination parameters for listing Bazaar resources."""

    type: str | None = None
    """Filter by protocol type (e.g., "http", "mcp")."""

    limit: int | None = None
    """Maximum number of resources to return per page."""

    offset: int | None = None
    """Offset of the first resource to return."""


@dataclass(config=ConfigDict(extra="forbid"))
class SearchDiscoveryResourcesParams:
    """Parameters for searching x402 resources in the CDP Bazaar."""

    query: str | None = None
    """Natural-language search query."""

    pay_to: str | None = None
    """Filter by merchant payment address."""

    scheme: str | None = None
    """Filter by payment scheme (e.g., "exact")."""

    network: str | None = None
    """Filter by network in CAIP-2 format (e.g., "eip155:8453") or legacy name (e.g., "base")."""

    asset: str | None = None
    """Filter by asset contract address."""

    url_substring: str | None = None
    """Filter to resources whose URL contains this value (case-insensitive substring match)."""

    extensions: list[str] | None = None
    """Filter by extension keys present on the resource."""

    max_usd_price: str | None = None
    """Filter to resources with a USD price at or below this value (e.g., "1.50")."""

    limit: int | None = None
    """Maximum number of results to return (1–20, default 20)."""


@dataclass(config=ConfigDict(extra="forbid"))
class MerchantResourcesParams:
    """Parameters for fetching a merchant's resources from the CDP Bazaar."""

    pay_to: str
    """Merchant's onchain payment address (required)."""

    limit: int | None = None
    """Maximum number of resources to return (1–100, default 25)."""

    offset: int | None = None
    """Offset of the first resource to return."""


def _correlation_headers() -> dict[str, str]:
    return {"Correlation-Context": _CORRELATION_CONTEXT}


def _build_list_params(params: ListDiscoveryResourcesParams | None) -> dict[str, str]:
    query: dict[str, str] = {}
    if params is None:
        return query
    if params.type is not None:
        query["type"] = params.type
    if params.limit is not None:
        query["limit"] = str(params.limit)
    if params.offset is not None:
        query["offset"] = str(params.offset)
    return query


def _build_search_param_list(
    params: SearchDiscoveryResourcesParams,
) -> list[tuple[str, _QueryParamValue]]:
    pairs: list[tuple[str, _QueryParamValue]] = []
    if params.query is not None:
        pairs.append(("query", params.query))
    if params.pay_to is not None:
        pairs.append(("payTo", params.pay_to))
    if params.scheme is not None:
        pairs.append(("scheme", params.scheme))
    if params.network is not None:
        pairs.append(("network", params.network))
    if params.asset is not None:
        pairs.append(("asset", params.asset))
    if params.url_substring is not None:
        pairs.append(("urlSubstring", params.url_substring))
    if params.max_usd_price is not None:
        pairs.append(("maxUsdPrice", params.max_usd_price))
    if params.limit is not None:
        pairs.append(("limit", str(params.limit)))
    if params.extensions:
        pairs.extend(("extensions", ext) for ext in params.extensions)
    return pairs


def _build_merchant_params(params: MerchantResourcesParams) -> dict[str, str]:
    query: dict[str, str] = {"payTo": params.pay_to}
    if params.limit is not None:
        query["limit"] = str(params.limit)
    if params.offset is not None:
        query["offset"] = str(params.offset)
    return query


def _parse_resource(data: dict[str, Any]) -> X402DiscoveryResource:
    """Build an X402DiscoveryResource using model_construct to skip strict validators.

    The SDK's nested X402PaymentRequirements model enforces a regex on asset addresses
    that real API responses may not satisfy (e.g. longer Solana token addresses, new
    address formats). model_construct bypasses all validators while preserving the type.
    """
    quality: X402ResourceQuality | None = None
    if q := data.get("quality"):
        quality = X402ResourceQuality.model_construct(
            l30_days_total_calls=q.get("l30DaysTotalCalls"),
            l30_days_unique_payers=q.get("l30DaysUniquePayers"),
            last_called_at=q.get("lastCalledAt"),
        )
    accepts: list[X402PaymentRequirements] | None = None
    if isinstance(data.get("accepts"), list):
        accepts = [
            parsed
            for requirement in data["accepts"]
            if (parsed := _parse_payment_requirement(requirement)) is not None
        ]
    return X402DiscoveryResource.model_construct(
        resource=data.get("resource", ""),
        description=data.get("description"),
        type=data.get("type", ""),
        x402_version=data.get("x402Version", 2),
        last_updated=data.get("lastUpdated"),
        accepts=accepts,
        extensions=data.get("extensions"),
        quality=quality,
    )


def _parse_payment_requirement(raw: Any) -> X402PaymentRequirements | None:
    if isinstance(raw, X402PaymentRequirements):
        return raw
    if not isinstance(raw, dict):
        return None

    if "amount" in raw:
        actual = _construct_model_from_raw(X402V2PaymentRequirements, raw)
    else:
        actual = _construct_model_from_raw(X402V1PaymentRequirements, raw)
    return X402PaymentRequirements.model_construct(actual_instance=actual)


def _construct_model_from_raw(model_cls: Any, raw: dict[str, Any]) -> Any:
    normalized: dict[str, Any] = {}
    for field_name, field_info in model_cls.model_fields.items():
        if field_name in raw:
            normalized[field_name] = raw[field_name]
            continue
        if field_info.alias and field_info.alias in raw:
            normalized[field_name] = raw[field_info.alias]
    return model_cls.model_construct(**normalized)


def _parse_list_response(data: dict[str, Any]) -> X402DiscoveryResourcesResponse:
    from cdp.openapi_client.models.x402_discovery_resources_response_pagination import (
        X402DiscoveryResourcesResponsePagination,
    )

    pagination = X402DiscoveryResourcesResponsePagination.model_construct(
        **{k: data.get("pagination", {}).get(k) for k in ("limit", "offset", "total")}
    )
    return X402DiscoveryResourcesResponse.model_construct(
        x402_version=data.get("x402Version", 2),
        items=[_parse_resource(item) for item in data.get("items", [])],
        pagination=pagination,
    )


def _parse_search_response(data: dict[str, Any]) -> X402SearchResourcesResponse:
    """Build an X402SearchResourcesResponse, bypassing strict enum validation.

    The SDK searchMethod enum only lists known values at generation time; new
    values (e.g. "hybrid") may be added by the API before the SDK is regenerated.
    """
    return X402SearchResourcesResponse.model_construct(
        x402_version=data.get("x402Version", 2),
        resources=[_parse_resource(r) for r in data.get("resources", [])],
        partial_results=data.get("partialResults", False),
        search_method=data.get("searchMethod"),
    )


def _parse_merchant_response(data: dict[str, Any]) -> X402DiscoveryMerchantResponse:
    from cdp.openapi_client.models.x402_discovery_merchant_response_pagination import (
        X402DiscoveryMerchantResponsePagination,
    )

    pagination = X402DiscoveryMerchantResponsePagination.model_construct(
        **{k: data.get("pagination", {}).get(k) for k in ("limit", "offset", "total")}
    )
    return X402DiscoveryMerchantResponse.model_construct(
        x402_version=data.get("x402Version", 2),
        pay_to=data.get("payTo", ""),
        resources=[_parse_resource(r) for r in data.get("resources", [])],
        pagination=pagination,
    )


def _empty_merchant_response(params: MerchantResourcesParams) -> X402DiscoveryMerchantResponse:
    """Return a synthetic empty merchant response for a 404 (merchant not yet registered)."""
    pagination: dict[str, Any] = {}
    if params.limit is not None:
        pagination["limit"] = params.limit
    if params.offset is not None:
        pagination["offset"] = params.offset
    return _parse_merchant_response(
        {
            "x402Version": 2,
            "payTo": params.pay_to,
            "resources": [],
            "pagination": pagination,
        }
    )


class CdpBazaarClient:
    """CDP Bazaar client for discovering and searching x402-gated resources.

    The CDP Bazaar discovery endpoints are unauthenticated — no CDP API key
    credentials are required.

    A single :class:`httpx.Client` is created on construction and reused across
    all calls to avoid per-request connection-pool setup/teardown overhead.
    Async calls share a lazily-created :class:`httpx.AsyncClient` that is
    created on first async use and bound to that event loop — do not reuse a
    single :class:`CdpBazaarClient` across separate :func:`asyncio.run` calls
    or different event loops.

    The client may be used as a context manager to ensure underlying HTTP
    connections are closed deterministically:

    - Sync-only use: ``with create_cdp_bazaar_client() as client``
    - Async or mixed use: ``async with create_cdp_bazaar_client() as client``

    Alternatively, call :meth:`close` for sync-only cleanup or :meth:`aclose`
    when async methods have been used. Calling :meth:`close` while an async
    HTTP client is open emits a :exc:`ResourceWarning`.

    Example:
        ```python
        from cdp_x402 import create_cdp_bazaar_client

        with create_cdp_bazaar_client() as client:
            resources = client.list_resources(ListDiscoveryResourcesParams(limit=10))
            results = client.search_resources(
                SearchDiscoveryResourcesParams(query="weather", max_usd_price="1.00")
            )
            merchant = client.get_merchant_resources(
                MerchantResourcesParams(pay_to="0xYourAddress")
            )
        ```
    """

    def __init__(self, base_url: str = CDP_FACILITATOR_URL) -> None:
        self._base_url = base_url.rstrip("/")
        self._http: httpx.Client = httpx.Client(headers=_correlation_headers())
        self._async_http: httpx.AsyncClient | None = None

    def _get_async_http(self) -> httpx.AsyncClient:
        if self._async_http is None:
            self._async_http = httpx.AsyncClient(headers=_correlation_headers())
        return self._async_http

    def close(self) -> None:
        """Close the underlying sync HTTP client and release its connections.

        If async methods have been used since construction, call :meth:`aclose`
        (or use ``async with``) instead so the async HTTP client is also closed.
        Calling this method while an async client is open emits a
        :exc:`ResourceWarning` and leaves those connections unreleased until
        garbage-collected.
        """
        if self._async_http is not None:
            import warnings

            warnings.warn(
                f"{self.__class__.__name__}.close() called while an async HTTP client is open. "
                "Use 'async with' or 'await aclose()' to release all connections.",
                ResourceWarning,
                stacklevel=2,
            )
        self._http.close()

    async def aclose(self) -> None:
        """Close both the async and sync HTTP clients and release their connections."""
        if self._async_http is not None:
            await self._async_http.aclose()
            self._async_http = None
        self.close()

    def __enter__(self) -> CdpBazaarClient:
        return self

    def __exit__(self, *_exc_info: Any) -> None:
        self.close()

    async def __aenter__(self) -> CdpBazaarClient:
        return self

    async def __aexit__(self, *_exc_info: Any) -> None:
        await self.aclose()

    def list_resources(
        self,
        params: ListDiscoveryResourcesParams | None = None,
    ) -> X402DiscoveryResourcesResponse:
        """List x402 discovery resources from the CDP Bazaar."""
        url = f"{self._base_url}{_DISCOVERY_RESOURCES_PATH}"
        response = self._http.get(url, params=_build_list_params(params))
        response.raise_for_status()
        return _parse_list_response(response.json())

    async def list_resources_async(
        self,
        params: ListDiscoveryResourcesParams | None = None,
    ) -> X402DiscoveryResourcesResponse:
        """Async version of list_resources."""
        url = f"{self._base_url}{_DISCOVERY_RESOURCES_PATH}"
        response = await self._get_async_http().get(url, params=_build_list_params(params))
        response.raise_for_status()
        return _parse_list_response(response.json())

    def search_resources(
        self,
        params: SearchDiscoveryResourcesParams | None = None,
    ) -> X402SearchResourcesResponse:
        """Search x402 resources in the CDP Bazaar using a natural-language query."""
        url = f"{self._base_url}{_DISCOVERY_SEARCH_PATH}"
        p = params or SearchDiscoveryResourcesParams()
        response = self._http.get(url, params=_build_search_param_list(p))
        response.raise_for_status()
        return _parse_search_response(response.json())

    async def search_resources_async(
        self,
        params: SearchDiscoveryResourcesParams | None = None,
    ) -> X402SearchResourcesResponse:
        """Async version of search_resources."""
        url = f"{self._base_url}{_DISCOVERY_SEARCH_PATH}"
        p = params or SearchDiscoveryResourcesParams()
        response = await self._get_async_http().get(url, params=_build_search_param_list(p))
        response.raise_for_status()
        return _parse_search_response(response.json())

    def get_merchant_resources(
        self,
        params: MerchantResourcesParams,
    ) -> X402DiscoveryMerchantResponse:
        """Fetch all resources registered by a specific merchant address."""
        url = f"{self._base_url}{_DISCOVERY_MERCHANT_PATH}"
        response = self._http.get(url, params=_build_merchant_params(params))
        if response.status_code == 404:
            return _empty_merchant_response(params)
        response.raise_for_status()
        return _parse_merchant_response(response.json())

    async def get_merchant_resources_async(
        self,
        params: MerchantResourcesParams,
    ) -> X402DiscoveryMerchantResponse:
        """Async version of get_merchant_resources."""
        url = f"{self._base_url}{_DISCOVERY_MERCHANT_PATH}"
        response = await self._get_async_http().get(url, params=_build_merchant_params(params))
        if response.status_code == 404:
            return _empty_merchant_response(params)
        response.raise_for_status()
        return _parse_merchant_response(response.json())


def create_cdp_bazaar_client(base_url: str | None = None) -> CdpBazaarClient:
    """Create a CDP Bazaar client for discovering and searching x402-gated resources.

    The CDP Bazaar discovery endpoints are unauthenticated — no CDP API key
    credentials are required.

    Args:
        base_url: Override the CDP Bazaar base URL. Defaults to the CDP
            facilitator URL (``https://api.cdp.coinbase.com/platform/v2/x402``).

    Returns:
        A :class:`CdpBazaarClient` with ``list_resources``, ``search_resources``,
        ``get_merchant_resources``, and their async equivalents.

    The returned client reuses a single :class:`httpx.Client` (and lazily a
    single :class:`httpx.AsyncClient`) across calls to avoid per-request
    connection-pool overhead. Use it as a context manager or call
    :meth:`CdpBazaarClient.close` / :meth:`CdpBazaarClient.aclose` to release
    underlying connections.

    Example:
        ```python
        from cdp_x402 import create_cdp_bazaar_client

        with create_cdp_bazaar_client() as client:
            resources = client.list_resources()
            for resource in resources.items:
                print(resource.resource)

            results = client.search_resources(
                SearchDiscoveryResourcesParams(query="weather APIs", max_usd_price="1.00")
            )

            merchant = client.get_merchant_resources(
                MerchantResourcesParams(pay_to="0xYourAddress")
            )
        ```
    """
    return CdpBazaarClient(base_url=base_url or CDP_FACILITATOR_URL)
