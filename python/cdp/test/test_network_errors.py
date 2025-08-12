"""Test network error handling in CDP API client."""

import json
from unittest.mock import AsyncMock, patch

import pytest

from cdp.openapi_client.api_client import ApiClient
from cdp.openapi_client.cdp_api_client import CdpApiClient
from cdp.openapi_client.errors import ApiError, HttpErrorType, NetworkError
from cdp.openapi_client.exceptions import ApiException


class TestNetworkErrorHandling:
    """Test network error handling in CDP API client."""

    @pytest.fixture
    def api_client(self):
        """Create a CDP API client instance."""
        return CdpApiClient(
            api_key_id="test-key-id",
            api_key_secret="test-key-secret",
            base_path="https://api.cdp.coinbase.com/platform",
        )

    @pytest.fixture
    def mock_auth_headers(self):
        """Mock auth headers to bypass JWT generation."""
        with patch("cdp.openapi_client.cdp_api_client.get_auth_headers") as mock:
            mock.return_value = {
                "Authorization": "Bearer test-token",
                "X-CDP-Api-Signature": "test-signature",
            }
            yield mock

    @pytest.mark.asyncio
    async def test_connection_refused_error(self, api_client, mock_auth_headers):
        """Test handling of connection refused errors."""
        # Mock the parent class's call_api method to simulate network error
        with patch.object(ApiClient, "call_api", new_callable=AsyncMock) as mock_call:
            mock_call.side_effect = Exception("Connection refused")

            with pytest.raises(NetworkError) as exc_info:
                await api_client.call_api(method="GET", url="/test", _request_timeout=30)

            assert exc_info.value.error_type == HttpErrorType.NETWORK_CONNECTION_FAILED
            assert (
                exc_info.value.error_message
                == "Unable to connect to CDP service. The service may be unavailable."
            )
            assert exc_info.value.network_details["code"] == "ECONNREFUSED"
            assert exc_info.value.network_details["retryable"] is True

    @pytest.mark.asyncio
    async def test_timeout_error(self, api_client, mock_auth_headers):
        """Test handling of timeout errors."""
        with patch.object(ApiClient, "call_api", new_callable=AsyncMock) as mock_call:
            mock_call.side_effect = Exception("Request timed out")

            with pytest.raises(NetworkError) as exc_info:
                await api_client.call_api(method="GET", url="/test", _request_timeout=30)

            assert exc_info.value.error_type == HttpErrorType.NETWORK_TIMEOUT
            assert exc_info.value.error_message == "Request timed out. Please try again."
            assert exc_info.value.network_details["code"] == "ETIMEDOUT"
            assert exc_info.value.network_details["retryable"] is True

    @pytest.mark.asyncio
    async def test_dns_failure_error(self, api_client, mock_auth_headers):
        """Test handling of DNS resolution errors."""
        with patch.object(ApiClient, "call_api", new_callable=AsyncMock) as mock_call:
            mock_call.side_effect = Exception("getaddrinfo failed")

            with pytest.raises(NetworkError) as exc_info:
                await api_client.call_api(method="GET", url="/test", _request_timeout=30)

            assert exc_info.value.error_type == HttpErrorType.NETWORK_DNS_FAILURE
            assert (
                exc_info.value.error_message
                == "DNS resolution failed. Please check your network connection."
            )
            assert exc_info.value.network_details["code"] == "ENOTFOUND"
            assert exc_info.value.network_details["retryable"] is False

    @pytest.mark.asyncio
    async def test_ip_blocklist_error(self, api_client, mock_auth_headers):
        """Test handling of IP blocklist errors (403 with gateway message)."""
        api_exception = ApiException(status=403, reason="Forbidden")
        api_exception.body = "Forbidden: Your IP address is blocked"

        with patch.object(ApiClient, "call_api", new_callable=AsyncMock) as mock_call:
            mock_call.side_effect = api_exception

            with pytest.raises(NetworkError) as exc_info:
                await api_client.call_api(method="GET", url="/test", _request_timeout=30)

            assert exc_info.value.error_type == HttpErrorType.NETWORK_IP_BLOCKED
            assert (
                exc_info.value.error_message
                == "Access denied. Your IP address may be blocked or restricted."
            )
            assert exc_info.value.network_details["code"] == "IP_BLOCKED"
            assert exc_info.value.network_details["retryable"] is False

    @pytest.mark.asyncio
    async def test_regular_403_error(self, api_client, mock_auth_headers):
        """Test handling of regular 403 errors without gateway message."""
        api_exception = ApiException(status=403, reason="Forbidden")
        api_exception.body = json.dumps({"error": "Insufficient permissions"})

        with patch.object(ApiClient, "call_api", new_callable=AsyncMock) as mock_call:
            mock_call.side_effect = api_exception

            with pytest.raises(ApiError) as exc_info:
                await api_client.call_api(method="GET", url="/test", _request_timeout=30)

            assert exc_info.value.error_type == HttpErrorType.UNAUTHORIZED
            assert (
                exc_info.value.error_message
                == "Forbidden. You don't have permission to access this resource."
            )
            assert exc_info.value.http_code == 403

    @pytest.mark.asyncio
    async def test_generic_network_error(self, api_client, mock_auth_headers):
        """Test handling of generic network errors."""
        with patch.object(ApiClient, "call_api", new_callable=AsyncMock) as mock_call:
            mock_call.side_effect = Exception("Connection reset by peer")

            with pytest.raises(NetworkError) as exc_info:
                await api_client.call_api(method="GET", url="/test", _request_timeout=30)

            assert exc_info.value.error_type == HttpErrorType.NETWORK_CONNECTION_FAILED
            assert (
                exc_info.value.error_message
                == "Network error occurred. Please check your connection and try again."
            )
            assert exc_info.value.network_details["code"] == "NETWORK_ERROR"
            assert exc_info.value.network_details["retryable"] is True

    @pytest.mark.asyncio
    async def test_404_error(self, api_client, mock_auth_headers):
        """Test handling of 404 errors."""
        api_exception = ApiException(status=404, reason="Not Found")
        api_exception.body = json.dumps({"error": "Resource not found"})

        with patch.object(ApiClient, "call_api", new_callable=AsyncMock) as mock_call:
            mock_call.side_effect = api_exception

            with pytest.raises(ApiError) as exc_info:
                await api_client.call_api(method="GET", url="/test", _request_timeout=30)

            assert exc_info.value.error_type == HttpErrorType.NOT_FOUND
            assert exc_info.value.error_message == "API not found"
            assert exc_info.value.http_code == 404


class TestNetworkErrorStringRepresentation:
    """Test NetworkError string representation."""

    def test_network_error_str_with_details(self):
        """Test NetworkError string representation with network details."""
        error = NetworkError(
            error_type=HttpErrorType.NETWORK_IP_BLOCKED,
            error_message="IP blocked",
            network_details={"code": "IP_BLOCKED", "retryable": False},
        )

        error_str = str(error)
        assert "NetworkError" in error_str
        assert "network_details={code=IP_BLOCKED, retryable=False}" in error_str

    def test_network_error_str_without_details(self):
        """Test NetworkError string representation without network details."""
        error = NetworkError(
            error_type=HttpErrorType.NETWORK_CONNECTION_FAILED, error_message="Connection failed"
        )

        error_str = str(error)
        assert "NetworkError" in error_str
        assert "network_details" not in error_str
