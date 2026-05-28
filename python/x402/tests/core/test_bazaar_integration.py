"""
Integration tests for the CDP Bazaar client against the real CDP Bazaar API.

No credentials required — the Bazaar discovery endpoints are unauthenticated.
"""

from collections.abc import AsyncIterator, Iterator

import pytest
import pytest_asyncio
from cdp.openapi_client.models import (
    X402DiscoveryResource,
    X402DiscoveryResourcesResponse,
    X402SearchResourcesResponse,
)

from cdp_x402.core.bazaar import (
    CdpBazaarClient,
    ListDiscoveryResourcesParams,
    SearchDiscoveryResourcesParams,
    create_cdp_bazaar_client,
)


@pytest.fixture(scope="module")
def client() -> Iterator[CdpBazaarClient]:
    """Sync client shared across all sync tests in this module."""
    with create_cdp_bazaar_client() as c:
        yield c


@pytest_asyncio.fixture
async def async_client() -> AsyncIterator[CdpBazaarClient]:
    """Per-test async client so each async test gets its own event-loop-bound connection."""
    async with create_cdp_bazaar_client() as c:
        yield c


class TestListResourcesIntegration:
    def test_returns_list_response_shape(self, client: CdpBazaarClient) -> None:
        result = client.list_resources(ListDiscoveryResourcesParams(limit=5))

        assert isinstance(result, X402DiscoveryResourcesResponse)
        assert isinstance(result.x402_version, int)
        assert isinstance(result.items, list)
        assert result.pagination is not None

    def test_each_item_has_required_fields(self, client: CdpBazaarClient) -> None:
        result = client.list_resources(ListDiscoveryResourcesParams(limit=5))

        for item in result.items:
            assert isinstance(item, X402DiscoveryResource)
            assert isinstance(item.resource, str)
            assert len(item.resource) > 0
            assert isinstance(item.type, str)
            assert isinstance(item.x402_version, int)

    def test_filters_by_type_http(self, client: CdpBazaarClient) -> None:
        result = client.list_resources(ListDiscoveryResourcesParams(type="http", limit=5))
        assert isinstance(result, X402DiscoveryResourcesResponse)
        assert isinstance(result.items, list)

    def test_respects_limit(self, client: CdpBazaarClient) -> None:
        result = client.list_resources(ListDiscoveryResourcesParams(limit=2))
        assert isinstance(result.items, list)

    def test_pagination_offset(self, client: CdpBazaarClient) -> None:
        page1 = client.list_resources(ListDiscoveryResourcesParams(limit=2, offset=0))
        page2 = client.list_resources(ListDiscoveryResourcesParams(limit=2, offset=2))
        assert isinstance(page1.items, list)
        assert isinstance(page2.items, list)

    @pytest.mark.asyncio
    async def test_async_list_resources(self, async_client: CdpBazaarClient) -> None:
        result = await async_client.list_resources_async(ListDiscoveryResourcesParams(limit=3))
        assert isinstance(result, X402DiscoveryResourcesResponse)
        assert isinstance(result.items, list)


class TestSearchResourcesIntegration:
    def test_returns_search_response_shape(self, client: CdpBazaarClient) -> None:
        result = client.search_resources(SearchDiscoveryResourcesParams(query="weather", limit=5))

        assert isinstance(result, X402SearchResourcesResponse)
        assert isinstance(result.x402_version, int)
        assert isinstance(result.resources, list)
        assert isinstance(result.partial_results, bool)

    def test_each_result_has_required_fields(self, client: CdpBazaarClient) -> None:
        result = client.search_resources(SearchDiscoveryResourcesParams(query="API", limit=5))

        for item in result.resources:
            assert isinstance(item, X402DiscoveryResource)
            assert isinstance(item.resource, str)
            assert len(item.resource) > 0
            assert isinstance(item.type, str)

    def test_filters_by_network(self, client: CdpBazaarClient) -> None:
        result = client.search_resources(
            SearchDiscoveryResourcesParams(
                query="payment",
                network="eip155:8453",
                limit=5,
            )
        )
        assert isinstance(result.resources, list)

    @pytest.mark.asyncio
    async def test_async_search_resources(self, async_client: CdpBazaarClient) -> None:
        result = await async_client.search_resources_async(
            SearchDiscoveryResourcesParams(query="weather", limit=3)
        )

        assert isinstance(result, X402SearchResourcesResponse)
        assert isinstance(result.resources, list)
