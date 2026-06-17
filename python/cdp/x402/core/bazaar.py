"""CDP Bazaar client for discovering and searching x402-gated resources."""

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

from cdp.x402.core.constants import CDP_FACILITATOR_URL, SDK_CORRELATION_CONTEXT

__all__ = [
    "X402DiscoveryResource",
    "X402DiscoveryResourcesResponse",
    "X402DiscoveryMerchantResponse",
    "X402ResourceQuality",
    "X402SearchResourcesResponse",
    "ListDiscoveryResourcesParams",
    "SearchDiscoveryResourcesParams",
    "MerchantResourcesParams",
    "CDPBazaarClient",
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
    limit: int | None = None
    offset: int | None = None


@dataclass(config=ConfigDict(extra="forbid"))
class SearchDiscoveryResourcesParams:
    """Parameters for searching x402 resources in the CDP Bazaar."""

    query: str | None = None
    pay_to: str | None = None
    scheme: str | None = None
    network: str | None = None
    asset: str | None = None
    url_substring: str | None = None
    extensions: list[str] | None = None
    max_usd_price: str | None = None
    limit: int | None = None


@dataclass(config=ConfigDict(extra="forbid"))
class MerchantResourcesParams:
    """Parameters for fetching a merchant's resources from the CDP Bazaar."""

    pay_to: str
    limit: int | None = None
    offset: int | None = None


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


class CDPBazaarClient:
    """CDP Bazaar client for discovering and searching x402-gated resources."""

    def __init__(self, base_url: str = CDP_FACILITATOR_URL) -> None:
        self._base_url = base_url.rstrip("/")
        self._http: httpx.Client = httpx.Client(headers=_correlation_headers())
        self._async_http: httpx.AsyncClient | None = None

    def _get_async_http(self) -> httpx.AsyncClient:
        if self._async_http is None:
            self._async_http = httpx.AsyncClient(headers=_correlation_headers())
        return self._async_http

    def close(self) -> None:
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
        if self._async_http is not None:
            await self._async_http.aclose()
            self._async_http = None
        self.close()

    def __enter__(self) -> CDPBazaarClient:
        return self

    def __exit__(self, *_exc_info: Any) -> None:
        self.close()

    async def __aenter__(self) -> CDPBazaarClient:
        return self

    async def __aexit__(self, *_exc_info: Any) -> None:
        await self.aclose()

    def list_resources(
        self,
        params: ListDiscoveryResourcesParams | None = None,
    ) -> X402DiscoveryResourcesResponse:
        url = f"{self._base_url}{_DISCOVERY_RESOURCES_PATH}"
        response = self._http.get(url, params=_build_list_params(params))
        response.raise_for_status()
        return _parse_list_response(response.json())

    async def list_resources_async(
        self,
        params: ListDiscoveryResourcesParams | None = None,
    ) -> X402DiscoveryResourcesResponse:
        url = f"{self._base_url}{_DISCOVERY_RESOURCES_PATH}"
        response = await self._get_async_http().get(url, params=_build_list_params(params))
        response.raise_for_status()
        return _parse_list_response(response.json())

    def search_resources(
        self,
        params: SearchDiscoveryResourcesParams | None = None,
    ) -> X402SearchResourcesResponse:
        url = f"{self._base_url}{_DISCOVERY_SEARCH_PATH}"
        p = params or SearchDiscoveryResourcesParams()
        response = self._http.get(url, params=_build_search_param_list(p))
        response.raise_for_status()
        return _parse_search_response(response.json())

    async def search_resources_async(
        self,
        params: SearchDiscoveryResourcesParams | None = None,
    ) -> X402SearchResourcesResponse:
        url = f"{self._base_url}{_DISCOVERY_SEARCH_PATH}"
        p = params or SearchDiscoveryResourcesParams()
        response = await self._get_async_http().get(url, params=_build_search_param_list(p))
        response.raise_for_status()
        return _parse_search_response(response.json())

    def get_merchant_resources(
        self,
        params: MerchantResourcesParams,
    ) -> X402DiscoveryMerchantResponse:
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
        url = f"{self._base_url}{_DISCOVERY_MERCHANT_PATH}"
        response = await self._get_async_http().get(url, params=_build_merchant_params(params))
        if response.status_code == 404:
            return _empty_merchant_response(params)
        response.raise_for_status()
        return _parse_merchant_response(response.json())


def create_cdp_bazaar_client(base_url: str | None = None) -> CDPBazaarClient:
    """Create a CDP Bazaar client for discovering and searching x402-gated resources."""
    return CDPBazaarClient(base_url=base_url or CDP_FACILITATOR_URL)
