"""Unit tests for the CDP Bazaar client."""

from unittest.mock import AsyncMock, MagicMock, patch

import httpx
import pytest
from cdp.openapi_client.models import (
    X402DiscoveryMerchantResponse,
    X402DiscoveryResource,
    X402DiscoveryResourcesResponse,
    X402PaymentRequirements,
    X402ResourceQuality,
    X402SearchResourcesResponse,
    X402V2PaymentRequirements,
)

from cdp_x402.core.bazaar import (
    CdpBazaarClient,
    ListDiscoveryResourcesParams,
    MerchantResourcesParams,
    SearchDiscoveryResourcesParams,
    create_cdp_bazaar_client,
)
from cdp_x402.core.constants import CDP_FACILITATOR_URL

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _make_list_json() -> dict:
    return {
        "x402Version": 2,
        "items": [
            {
                "resource": "https://api.example.com/weather",
                "description": "Real-time weather data",
                "type": "http",
                "x402Version": 2,
                "accepts": [],
                "lastUpdated": "2026-01-01T00:00:00Z",
                "quality": {"l30DaysTotalCalls": 10, "l30DaysUniquePayers": 3},
            }
        ],
        "pagination": {"limit": 20, "offset": 0, "total": 1},
    }


def _make_search_json() -> dict:
    return {
        "x402Version": 2,
        "resources": [
            {
                "resource": "https://api.example.com/weather",
                "description": "Weather API",
                "type": "http",
                "x402Version": 2,
                "accepts": [],
            }
        ],
        "partialResults": False,
        "searchMethod": "vector",
    }


def _make_merchant_json() -> dict:
    return {
        "x402Version": 2,
        "payTo": "0xmerchant",
        "resources": [
            {
                "resource": "https://api.example.com/data",
                "type": "http",
                "x402Version": 2,
                "accepts": [],
            }
        ],
        "pagination": {"limit": 25, "offset": 0, "total": 1},
    }


def _make_http_response(status_code: int = 200, json_data: dict | None = None) -> MagicMock:
    resp = MagicMock()
    resp.status_code = status_code
    resp.json.return_value = json_data or {}
    resp.text = "error body"
    if status_code >= 400:
        resp.raise_for_status.side_effect = httpx.HTTPStatusError(
            message=f"HTTP error {status_code}",
            request=MagicMock(),
            response=resp,
        )
    else:
        resp.raise_for_status.return_value = None
    return resp


def _make_sync_client_mock(response: MagicMock) -> MagicMock:
    """Patch httpx.Client so its constructor returns a mock whose get() yields response."""
    mock_client = MagicMock()
    mock_client.get.return_value = response
    return mock_client


def _make_async_client_mock(response: MagicMock) -> AsyncMock:
    mock_client = AsyncMock()
    mock_client.get = AsyncMock(return_value=response)
    mock_client.aclose = AsyncMock(return_value=None)
    return mock_client


# ---------------------------------------------------------------------------
# create_cdp_bazaar_client factory
# ---------------------------------------------------------------------------


class TestCreateCdpBazaarClient:
    def test_returns_cdp_bazaar_client_instance(self) -> None:
        with create_cdp_bazaar_client() as client:
            assert isinstance(client, CdpBazaarClient)

    def test_uses_default_base_url(self) -> None:
        with create_cdp_bazaar_client() as client:
            assert client._base_url == CDP_FACILITATOR_URL

    def test_accepts_custom_base_url(self) -> None:
        with create_cdp_bazaar_client(base_url="https://custom.example.com") as client:
            assert client._base_url == "https://custom.example.com"

    def test_strips_trailing_slash_from_base_url(self) -> None:
        with create_cdp_bazaar_client(base_url="https://custom.example.com/") as client:
            assert not client._base_url.endswith("/")


# ---------------------------------------------------------------------------
# Connection pooling: single persistent client per CdpBazaarClient
# ---------------------------------------------------------------------------


class TestClientReuse:
    @patch("cdp_x402.core.bazaar.httpx.Client")
    def test_creates_single_sync_client_in_init(self, mock_client_cls: MagicMock) -> None:
        mock_client_cls.return_value = _make_sync_client_mock(
            _make_http_response(json_data=_make_list_json())
        )

        client = create_cdp_bazaar_client()

        assert mock_client_cls.call_count == 1
        client.close()

    @patch("cdp_x402.core.bazaar.httpx.Client")
    def test_reuses_sync_client_across_multiple_calls(self, mock_client_cls: MagicMock) -> None:
        mock_http = _make_sync_client_mock(_make_http_response(json_data=_make_list_json()))
        mock_client_cls.return_value = mock_http

        client = create_cdp_bazaar_client()
        client.list_resources()
        client.list_resources()
        client.search_resources(SearchDiscoveryResourcesParams(query="x"))
        client.get_merchant_resources(MerchantResourcesParams(pay_to="0x"))

        assert mock_client_cls.call_count == 1
        assert mock_http.get.call_count == 4
        client.close()

    @patch("cdp_x402.core.bazaar.httpx.Client")
    def test_sets_correlation_context_header_on_client(self, mock_client_cls: MagicMock) -> None:
        mock_client_cls.return_value = _make_sync_client_mock(_make_http_response())

        create_cdp_bazaar_client()

        headers = mock_client_cls.call_args.kwargs["headers"]
        assert "Correlation-Context" in headers
        assert "cdp-x402" in headers["Correlation-Context"]

    @patch("cdp_x402.core.bazaar.httpx.Client")
    def test_close_closes_underlying_sync_client(self, mock_client_cls: MagicMock) -> None:
        mock_http = _make_sync_client_mock(_make_http_response())
        mock_client_cls.return_value = mock_http

        client = create_cdp_bazaar_client()
        client.close()

        mock_http.close.assert_called_once()

    @patch("cdp_x402.core.bazaar.httpx.Client")
    def test_context_manager_closes_underlying_sync_client(
        self, mock_client_cls: MagicMock
    ) -> None:
        mock_http = _make_sync_client_mock(_make_http_response())
        mock_client_cls.return_value = mock_http

        with create_cdp_bazaar_client():
            pass

        mock_http.close.assert_called_once()

    @pytest.mark.asyncio
    @patch("cdp_x402.core.bazaar.httpx.AsyncClient")
    @patch("cdp_x402.core.bazaar.httpx.Client")
    async def test_async_client_is_lazy_and_reused(
        self,
        mock_sync_client_cls: MagicMock,
        mock_async_client_cls: MagicMock,
    ) -> None:
        mock_sync_client_cls.return_value = _make_sync_client_mock(_make_http_response())
        mock_async_http = _make_async_client_mock(_make_http_response(json_data=_make_list_json()))
        mock_async_client_cls.return_value = mock_async_http

        client = create_cdp_bazaar_client()
        assert mock_async_client_cls.call_count == 0

        await client.list_resources_async()
        await client.list_resources_async()
        await client.search_resources_async(SearchDiscoveryResourcesParams(query="x"))

        assert mock_async_client_cls.call_count == 1
        assert mock_async_http.get.call_count == 3

        await client.aclose()
        mock_async_http.aclose.assert_awaited_once()

    @pytest.mark.asyncio
    @patch("cdp_x402.core.bazaar.httpx.AsyncClient")
    @patch("cdp_x402.core.bazaar.httpx.Client")
    async def test_close_warns_when_async_client_is_open(
        self,
        mock_sync_client_cls: MagicMock,
        mock_async_client_cls: MagicMock,
    ) -> None:
        mock_sync_client_cls.return_value = _make_sync_client_mock(_make_http_response())
        mock_async_client_cls.return_value = _make_async_client_mock(
            _make_http_response(json_data=_make_list_json())
        )

        client = create_cdp_bazaar_client()
        await client.list_resources_async()

        with pytest.warns(ResourceWarning, match="async"):
            client.close()


# ---------------------------------------------------------------------------
# list_resources (sync)
# ---------------------------------------------------------------------------


class TestListResources:
    @patch("cdp_x402.core.bazaar.httpx.Client")
    def test_sends_get_to_discovery_resources_endpoint(self, mock_client_cls: MagicMock) -> None:
        mock_http = _make_sync_client_mock(_make_http_response(json_data=_make_list_json()))
        mock_client_cls.return_value = mock_http

        client = create_cdp_bazaar_client()
        client.list_resources()

        mock_http.get.assert_called_once()
        call_args = mock_http.get.call_args
        url = call_args[0][0] if call_args[0] else call_args[1].get("url", "")
        assert "/discovery/resources" in url

    @patch("cdp_x402.core.bazaar.httpx.Client")
    def test_passes_type_param(self, mock_client_cls: MagicMock) -> None:
        mock_http = _make_sync_client_mock(_make_http_response(json_data=_make_list_json()))
        mock_client_cls.return_value = mock_http

        client = create_cdp_bazaar_client()
        client.list_resources(ListDiscoveryResourcesParams(type="http"))

        call_kwargs = mock_http.get.call_args.kwargs
        assert call_kwargs["params"]["type"] == "http"

    @patch("cdp_x402.core.bazaar.httpx.Client")
    def test_passes_limit_and_offset(self, mock_client_cls: MagicMock) -> None:
        mock_http = _make_sync_client_mock(_make_http_response(json_data=_make_list_json()))
        mock_client_cls.return_value = mock_http

        client = create_cdp_bazaar_client()
        client.list_resources(ListDiscoveryResourcesParams(limit=5, offset=10))

        call_kwargs = mock_http.get.call_args.kwargs
        assert call_kwargs["params"]["limit"] == "5"
        assert call_kwargs["params"]["offset"] == "10"

    @patch("cdp_x402.core.bazaar.httpx.Client")
    def test_returns_parsed_response(self, mock_client_cls: MagicMock) -> None:
        mock_http = _make_sync_client_mock(_make_http_response(json_data=_make_list_json()))
        mock_client_cls.return_value = mock_http

        client = create_cdp_bazaar_client()
        result = client.list_resources()

        assert isinstance(result, X402DiscoveryResourcesResponse)
        assert result.x402_version == 2
        assert len(result.items) == 1
        assert isinstance(result.items[0], X402DiscoveryResource)
        assert result.items[0].resource == "https://api.example.com/weather"
        assert result.items[0].type == "http"
        assert result.items[0].description == "Real-time weather data"
        assert isinstance(result.items[0].quality, X402ResourceQuality)
        assert result.items[0].quality.l30_days_total_calls == 10
        assert result.pagination.total == 1

    @patch("cdp_x402.core.bazaar.httpx.Client")
    def test_parses_accepts_entries_as_typed_models(self, mock_client_cls: MagicMock) -> None:
        payload = _make_list_json()
        payload["items"][0]["accepts"] = [
            {
                "scheme": "exact",
                "network": "eip155:8453",
                "asset": "0x123",
                "payTo": "0xmerchant",
                "amount": "100",
                "maxTimeoutSeconds": 60,
            }
        ]
        mock_http = _make_sync_client_mock(_make_http_response(json_data=payload))
        mock_client_cls.return_value = mock_http

        client = create_cdp_bazaar_client()
        result = client.list_resources()

        assert result.items[0].accepts is not None
        requirement = result.items[0].accepts[0]
        assert isinstance(requirement, X402PaymentRequirements)
        assert isinstance(requirement.actual_instance, X402V2PaymentRequirements)
        assert requirement.actual_instance.pay_to == "0xmerchant"

    @patch("cdp_x402.core.bazaar.httpx.Client")
    def test_raises_on_non_200_response(self, mock_client_cls: MagicMock) -> None:
        mock_http = _make_sync_client_mock(_make_http_response(status_code=503))
        mock_client_cls.return_value = mock_http

        client = create_cdp_bazaar_client()
        with pytest.raises(httpx.HTTPStatusError):
            client.list_resources()


# ---------------------------------------------------------------------------
# list_resources_async
# ---------------------------------------------------------------------------


class TestListResourcesAsync:
    @pytest.mark.asyncio
    @patch("cdp_x402.core.bazaar.httpx.AsyncClient")
    @patch("cdp_x402.core.bazaar.httpx.Client")
    async def test_returns_parsed_response(
        self,
        mock_sync_client_cls: MagicMock,
        mock_async_client_cls: MagicMock,
    ) -> None:
        mock_sync_client_cls.return_value = _make_sync_client_mock(_make_http_response())
        mock_async_client_cls.return_value = _make_async_client_mock(
            _make_http_response(json_data=_make_list_json())
        )

        client = create_cdp_bazaar_client()
        result = await client.list_resources_async()

        assert isinstance(result, X402DiscoveryResourcesResponse)
        assert result.x402_version == 2


# ---------------------------------------------------------------------------
# search_resources (sync)
# ---------------------------------------------------------------------------


class TestSearchResources:
    @patch("cdp_x402.core.bazaar.httpx.Client")
    def test_sends_get_to_discovery_search_endpoint(self, mock_client_cls: MagicMock) -> None:
        mock_http = _make_sync_client_mock(_make_http_response(json_data=_make_search_json()))
        mock_client_cls.return_value = mock_http

        client = create_cdp_bazaar_client()
        client.search_resources(SearchDiscoveryResourcesParams(query="weather"))

        mock_http.get.assert_called_once()
        call_args = mock_http.get.call_args
        url = call_args[0][0] if call_args[0] else call_args[1].get("url", "")
        assert "/discovery/search" in url

    @patch("cdp_x402.core.bazaar.httpx.Client")
    def test_passes_query_and_optional_filters(self, mock_client_cls: MagicMock) -> None:
        mock_http = _make_sync_client_mock(_make_http_response(json_data=_make_search_json()))
        mock_client_cls.return_value = mock_http

        client = create_cdp_bazaar_client()
        client.search_resources(
            SearchDiscoveryResourcesParams(
                query="weather",
                network="eip155:8453",
                scheme="exact",
                pay_to="0xabc",
                asset="0xtoken",
                max_usd_price="1.50",
                url_substring="api.example.com",
                limit=10,
            )
        )

        call_kwargs = mock_http.get.call_args.kwargs
        params = dict(call_kwargs["params"])
        assert params["query"] == "weather"
        assert params["network"] == "eip155:8453"
        assert params["scheme"] == "exact"
        assert params["payTo"] == "0xabc"
        assert params["asset"] == "0xtoken"
        assert params["maxUsdPrice"] == "1.50"
        assert params["urlSubstring"] == "api.example.com"
        assert params["limit"] == "10"

    @patch("cdp_x402.core.bazaar.httpx.Client")
    def test_passes_multiple_extensions_as_tuples(self, mock_client_cls: MagicMock) -> None:
        mock_http = _make_sync_client_mock(_make_http_response(json_data=_make_search_json()))
        mock_client_cls.return_value = mock_http

        client = create_cdp_bazaar_client()
        client.search_resources(
            SearchDiscoveryResourcesParams(
                query="test",
                extensions=["bazaar", "payment-identifier"],
            )
        )

        params_arg = mock_http.get.call_args.kwargs["params"]
        ext_values = [v for k, v in params_arg if k == "extensions"]
        assert "bazaar" in ext_values
        assert "payment-identifier" in ext_values

    @patch("cdp_x402.core.bazaar.httpx.Client")
    def test_returns_parsed_response(self, mock_client_cls: MagicMock) -> None:
        mock_http = _make_sync_client_mock(_make_http_response(json_data=_make_search_json()))
        mock_client_cls.return_value = mock_http

        client = create_cdp_bazaar_client()
        result = client.search_resources(SearchDiscoveryResourcesParams(query="weather"))

        assert isinstance(result, X402SearchResourcesResponse)
        assert result.x402_version == 2
        assert len(result.resources) == 1
        assert result.resources[0].resource == "https://api.example.com/weather"
        assert result.resources[0].description == "Weather API"
        assert result.partial_results is False
        assert result.search_method == "vector"

    @patch("cdp_x402.core.bazaar.httpx.Client")
    def test_raises_on_non_200_response(self, mock_client_cls: MagicMock) -> None:
        mock_http = _make_sync_client_mock(_make_http_response(status_code=400))
        mock_client_cls.return_value = mock_http

        client = create_cdp_bazaar_client()
        with pytest.raises(httpx.HTTPStatusError):
            client.search_resources(SearchDiscoveryResourcesParams(query="test"))


# ---------------------------------------------------------------------------
# search_resources_async
# ---------------------------------------------------------------------------


class TestSearchResourcesAsync:
    @pytest.mark.asyncio
    @patch("cdp_x402.core.bazaar.httpx.AsyncClient")
    @patch("cdp_x402.core.bazaar.httpx.Client")
    async def test_returns_parsed_response(
        self,
        mock_sync_client_cls: MagicMock,
        mock_async_client_cls: MagicMock,
    ) -> None:
        mock_sync_client_cls.return_value = _make_sync_client_mock(_make_http_response())
        mock_async_client_cls.return_value = _make_async_client_mock(
            _make_http_response(json_data=_make_search_json())
        )

        client = create_cdp_bazaar_client()
        result = await client.search_resources_async(SearchDiscoveryResourcesParams(query="test"))

        assert isinstance(result, X402SearchResourcesResponse)
        assert result.x402_version == 2


# ---------------------------------------------------------------------------
# get_merchant_resources (sync)
# ---------------------------------------------------------------------------


class TestGetMerchantResources:
    @patch("cdp_x402.core.bazaar.httpx.Client")
    def test_sends_get_to_discovery_merchant_endpoint(self, mock_client_cls: MagicMock) -> None:
        mock_http = _make_sync_client_mock(_make_http_response(json_data=_make_merchant_json()))
        mock_client_cls.return_value = mock_http

        client = create_cdp_bazaar_client()
        client.get_merchant_resources(MerchantResourcesParams(pay_to="0xmerchant"))

        mock_http.get.assert_called_once()
        call_args = mock_http.get.call_args
        url = call_args[0][0] if call_args[0] else call_args[1].get("url", "")
        assert "/discovery/merchant" in url

    @patch("cdp_x402.core.bazaar.httpx.Client")
    def test_passes_pay_to_param(self, mock_client_cls: MagicMock) -> None:
        mock_http = _make_sync_client_mock(_make_http_response(json_data=_make_merchant_json()))
        mock_client_cls.return_value = mock_http

        client = create_cdp_bazaar_client()
        client.get_merchant_resources(MerchantResourcesParams(pay_to="0xmerchant"))

        call_kwargs = mock_http.get.call_args.kwargs
        assert call_kwargs["params"]["payTo"] == "0xmerchant"

    @patch("cdp_x402.core.bazaar.httpx.Client")
    def test_passes_limit_and_offset(self, mock_client_cls: MagicMock) -> None:
        mock_http = _make_sync_client_mock(_make_http_response(json_data=_make_merchant_json()))
        mock_client_cls.return_value = mock_http

        client = create_cdp_bazaar_client()
        client.get_merchant_resources(
            MerchantResourcesParams(pay_to="0xmerchant", limit=10, offset=5)
        )

        call_kwargs = mock_http.get.call_args.kwargs
        assert call_kwargs["params"]["limit"] == "10"
        assert call_kwargs["params"]["offset"] == "5"

    @patch("cdp_x402.core.bazaar.httpx.Client")
    def test_returns_parsed_response(self, mock_client_cls: MagicMock) -> None:
        mock_http = _make_sync_client_mock(_make_http_response(json_data=_make_merchant_json()))
        mock_client_cls.return_value = mock_http

        client = create_cdp_bazaar_client()
        result = client.get_merchant_resources(MerchantResourcesParams(pay_to="0xmerchant"))

        assert isinstance(result, X402DiscoveryMerchantResponse)
        assert result.x402_version == 2
        assert result.pay_to == "0xmerchant"
        assert len(result.resources) == 1
        assert result.resources[0].resource == "https://api.example.com/data"
        assert result.pagination.total == 1

    @patch("cdp_x402.core.bazaar.httpx.Client")
    def test_raises_on_non_200_response(self, mock_client_cls: MagicMock) -> None:
        mock_http = _make_sync_client_mock(_make_http_response(status_code=400))
        mock_client_cls.return_value = mock_http

        client = create_cdp_bazaar_client()
        with pytest.raises(httpx.HTTPStatusError):
            client.get_merchant_resources(MerchantResourcesParams(pay_to="0xmerchant"))

    @patch("cdp_x402.core.bazaar.httpx.Client")
    def test_returns_empty_response_on_404(self, mock_client_cls: MagicMock) -> None:
        mock_http = _make_sync_client_mock(_make_http_response(status_code=404))
        mock_client_cls.return_value = mock_http

        client = create_cdp_bazaar_client()
        result = client.get_merchant_resources(
            MerchantResourcesParams(pay_to="0xmerchant", limit=25, offset=0)
        )

        assert isinstance(result, X402DiscoveryMerchantResponse)
        assert result.x402_version == 2
        assert result.pay_to == "0xmerchant"
        assert result.resources == []
        assert result.pagination.limit == 25
        assert result.pagination.offset == 0

    @patch("cdp_x402.core.bazaar.httpx.Client")
    def test_returns_empty_response_on_404_without_pagination_params(
        self, mock_client_cls: MagicMock
    ) -> None:
        mock_http = _make_sync_client_mock(_make_http_response(status_code=404))
        mock_client_cls.return_value = mock_http

        client = create_cdp_bazaar_client()
        result = client.get_merchant_resources(MerchantResourcesParams(pay_to="0xmerchant"))

        assert isinstance(result, X402DiscoveryMerchantResponse)
        assert result.x402_version == 2
        assert result.pay_to == "0xmerchant"
        assert result.resources == []
        assert result.pagination.limit is None
        assert result.pagination.offset is None


# ---------------------------------------------------------------------------
# get_merchant_resources_async
# ---------------------------------------------------------------------------


class TestGetMerchantResourcesAsync:
    @pytest.mark.asyncio
    @patch("cdp_x402.core.bazaar.httpx.AsyncClient")
    @patch("cdp_x402.core.bazaar.httpx.Client")
    async def test_returns_parsed_response(
        self,
        mock_sync_client_cls: MagicMock,
        mock_async_client_cls: MagicMock,
    ) -> None:
        mock_sync_client_cls.return_value = _make_sync_client_mock(_make_http_response())
        mock_async_client_cls.return_value = _make_async_client_mock(
            _make_http_response(json_data=_make_merchant_json())
        )

        client = create_cdp_bazaar_client()
        result = await client.get_merchant_resources_async(
            MerchantResourcesParams(pay_to="0xmerchant")
        )

        assert isinstance(result, X402DiscoveryMerchantResponse)
        assert result.x402_version == 2
        assert result.pay_to == "0xmerchant"

    @pytest.mark.asyncio
    @patch("cdp_x402.core.bazaar.httpx.AsyncClient")
    @patch("cdp_x402.core.bazaar.httpx.Client")
    async def test_returns_empty_response_on_404(
        self,
        mock_sync_client_cls: MagicMock,
        mock_async_client_cls: MagicMock,
    ) -> None:
        mock_sync_client_cls.return_value = _make_sync_client_mock(_make_http_response())
        mock_async_client_cls.return_value = _make_async_client_mock(
            _make_http_response(status_code=404)
        )

        client = create_cdp_bazaar_client()
        result = await client.get_merchant_resources_async(
            MerchantResourcesParams(pay_to="0xmerchant", limit=10, offset=5)
        )

        assert isinstance(result, X402DiscoveryMerchantResponse)
        assert result.x402_version == 2
        assert result.pay_to == "0xmerchant"
        assert result.resources == []
        assert result.pagination.limit == 10
        assert result.pagination.offset == 5
