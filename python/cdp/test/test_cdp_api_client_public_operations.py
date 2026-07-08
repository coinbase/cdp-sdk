"""Test unauthenticated (public) endpoint support in CdpApiClient."""

from unittest.mock import AsyncMock, patch

import pytest

from cdp.openapi_client.api_client import ApiClient
from cdp.openapi_client.cdp_api_client import CdpApiClient


@pytest.fixture
def mock_super_call_api():
    """Mock the parent ApiClient.call_api to avoid making real network calls."""
    with patch.object(ApiClient, "call_api", new_callable=AsyncMock) as mock_call:
        mock_call.return_value = "mock-response"
        yield mock_call


@pytest.mark.asyncio
async def test_calls_public_endpoint_without_credentials(mock_super_call_api):
    """A public (unauthenticated) operation should succeed with no credentials configured."""
    api_client = CdpApiClient(base_path="https://api.cdp.coinbase.com/platform")

    response = await api_client.call_api(method="GET", url="/v2/x402/discovery/search")

    assert response == "mock-response"
    sent_headers = mock_super_call_api.call_args.args[2]
    assert "Authorization" not in sent_headers
    assert "Correlation-Context" in sent_headers


@pytest.mark.asyncio
async def test_calls_public_endpoint_successfully_even_with_credentials(mock_super_call_api):
    """A public operation should still work normally when credentials are configured."""
    api_client = CdpApiClient(
        api_key_id="test-key-id",
        api_key_secret="test-key-secret",
        base_path="https://api.cdp.coinbase.com/platform",
    )

    with patch("cdp.openapi_client.cdp_api_client.get_auth_headers") as mock_get_headers:
        mock_get_headers.return_value = {"Correlation-Context": "sdk_language=python"}

        await api_client.call_api(method="POST", url="/v2/x402/validate")

        _, kwargs = mock_get_headers.call_args
        options = mock_get_headers.call_args.args[0]
        assert options.skip_auth is True


@pytest.mark.asyncio
async def test_raises_clear_error_for_non_public_endpoint_without_credentials():
    """A non-public operation without credentials should raise a clear, actionable error."""
    api_client = CdpApiClient(base_path="https://api.cdp.coinbase.com/platform")

    with pytest.raises(ValueError, match="Missing required CDP API Key configuration"):
        await api_client.call_api(method="GET", url="/v2/evm/accounts")


@pytest.mark.asyncio
async def test_still_authenticates_non_public_endpoint_with_credentials(mock_super_call_api):
    """A non-public operation with credentials configured should still attach a JWT."""
    api_client = CdpApiClient(
        api_key_id="test-key-id",
        api_key_secret="test-key-secret",
        base_path="https://api.cdp.coinbase.com/platform",
    )

    with patch("cdp.openapi_client.cdp_api_client.get_auth_headers") as mock_get_headers:
        mock_get_headers.return_value = {"Authorization": "Bearer test-token"}

        await api_client.call_api(method="GET", url="/v2/evm/accounts")

        options = mock_get_headers.call_args.args[0]
        assert options.skip_auth is False
