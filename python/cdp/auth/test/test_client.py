from unittest.mock import MagicMock, patch
from urllib.parse import urlparse

from cdp.auth.clients.urllib3.client import Urllib3AuthClient
from cdp.auth.utils.http import GetAuthHeadersOptions


@patch("cdp.auth.utils.http.generate_jwt", return_value="mock.jwt.token")
@patch("urllib3.PoolManager")
@patch("cdp.auth.clients.urllib3.client.get_auth_headers")
def test_request_adds_auth_headers(
    mock_get_headers, mock_pool_manager, mock_jwt, auth_client_options_factory
):
    """Test that requests include authentication headers."""
    # Setup
    options = auth_client_options_factory()
    base_url = "https://api.example.com"

    mock_client = MagicMock()
    mock_client.request = MagicMock()
    mock_pool_manager.return_value = mock_client

    mock_get_headers.return_value = {
        "Authorization": "Bearer test.token",
        "Content-Type": "application/json",
    }

    client = Urllib3AuthClient(options, base_url)

    # Execute
    client.request("GET", "/test")

    # Verify
    mock_get_headers.assert_called_once()
    call_args = mock_get_headers.call_args[0][0]
    assert isinstance(call_args, GetAuthHeadersOptions)
    assert call_args.api_key_id == "test-key-id"
    assert call_args.request_method == "GET"

    parsed_url = urlparse(f"https://{call_args.request_host}")
    assert parsed_url.hostname == "api.example.com"


@patch("cdp.auth.utils.http.generate_jwt", return_value="mock.jwt.token")
@patch("urllib3.PoolManager")
@patch("cdp.auth.clients.urllib3.client.get_auth_headers")
@patch("cdp.auth.clients.urllib3.client.logger")
def test_request_with_debug(
    mock_logger,
    mock_get_headers,
    mock_pool_manager,
    mock_jwt,
    auth_client_options_factory,
    http_client_factory,
    http_response_factory,
    auth_headers_factory,
):
    """Test client with debug logging enabled."""
    # Setup
    options = auth_client_options_factory()
    base_url = "https://api.example.com"

    mock_response = http_response_factory()
    mock_client = http_client_factory(response=mock_response)
    mock_pool_manager.return_value = mock_client

    mock_get_headers.return_value = auth_headers_factory()

    # Execute
    client = Urllib3AuthClient(options, base_url, debug=True)
    response = client.request("GET", "/test")

    # Verify
    assert mock_logger.debug.call_count == 2

    request_log_call = mock_logger.debug.call_args_list[0]
    log_format, method, url, headers, body = request_log_call[0]
    assert "HTTP Request:" in log_format
    assert method == "GET"
    assert "/test" in url

    response_log_call = mock_logger.debug.call_args_list[1]
    log_format, status, headers, body = response_log_call[0]
    assert "HTTP Response:" in log_format
    assert status == 200
    assert response.data == b'{"test": "data"}'

    assert response is mock_response
    assert response.status == 200
    assert response.data == b'{"test": "data"}'
    assert response.headers == {"Content-Type": "application/json"}


@patch("cdp.auth.utils.http.generate_jwt", return_value="mock.jwt.token")
@patch("urllib3.PoolManager")
@patch("cdp.auth.clients.urllib3.client.get_auth_headers")
def test_request_url_handling(
    mock_get_headers, mock_pool_manager, mock_jwt, auth_client_options_factory
):
    """Test handling of relative and absolute URLs."""
    # Setup
    options = auth_client_options_factory()
    base_url = "https://api.example.com"

    mock_client = MagicMock()
    mock_client.request = MagicMock()
    mock_pool_manager.return_value = mock_client

    mock_get_headers.return_value = {
        "Authorization": "Bearer test.token",
        "Content-Type": "application/json",
    }

    client = Urllib3AuthClient(options, base_url)

    # Test with relative URL
    client.request("GET", "/test")
    called_url = mock_client.request.call_args[1]["url"]
    assert called_url.startswith(base_url)

    # Test with absolute URL
    absolute_url = "https://other.example.com/test"
    client.request("GET", absolute_url)
    called_url = mock_client.request.call_args[1]["url"]
    assert called_url == absolute_url


@patch("cdp.auth.utils.http.generate_jwt", return_value="mock.jwt.token")
@patch("urllib3.PoolManager")
@patch("cdp.auth.clients.urllib3.client.get_auth_headers")
def test_request_merges_headers(
    mock_get_headers, mock_pool_manager, mock_jwt, auth_client_options_factory
):
    """Test that custom headers are merged with auth headers."""
    # Setup
    options = auth_client_options_factory()
    base_url = "https://api.example.com"

    mock_client = MagicMock()
    mock_client.request = MagicMock()
    mock_pool_manager.return_value = mock_client

    mock_get_headers.return_value = {
        "Authorization": "Bearer test.token",
        "Content-Type": "application/json",
    }

    client = Urllib3AuthClient(options, base_url)

    # Execute
    custom_headers = {"Custom-Header": "value"}
    client.request("GET", "/test", headers=custom_headers)

    # Verify
    actual_headers = mock_client.request.call_args[1]["headers"]
    assert "Custom-Header" in actual_headers
    assert "Authorization" in actual_headers


@patch("cdp.auth.utils.http.generate_jwt", return_value="mock.jwt.token")
@patch("urllib3.PoolManager")
@patch("cdp.auth.clients.urllib3.client.get_auth_headers")
def test_request_with_query_params(
    mock_get_headers, mock_pool_manager, mock_jwt, auth_client_options_factory
):
    """Test handling of query parameters in the URL."""
    # Setup
    options = auth_client_options_factory()
    base_url = "https://api.example.com"

    mock_client = MagicMock()
    mock_client.request = MagicMock()
    mock_pool_manager.return_value = mock_client

    mock_get_headers.return_value = {
        "Authorization": "Bearer test.token",
        "Content-Type": "application/json",
    }

    client = Urllib3AuthClient(options, base_url)

    # Execute
    client.request("GET", "/test", fields={"key": "value"})

    # Verify
    call_kwargs = mock_client.request.call_args[1]
    assert "fields" in call_kwargs
    assert call_kwargs["fields"] == {"key": "value"}
    assert call_kwargs["url"] == f"{base_url}/test"


@patch("cdp.auth.utils.http.generate_jwt", return_value="mock.jwt.token")
@patch("urllib3.PoolManager")
@patch("cdp.auth.clients.urllib3.client.get_auth_headers")
def test_request_with_json_body(
    mock_get_headers, mock_pool_manager, mock_jwt, auth_client_options_factory
):
    """Test request with JSON body."""
    # Setup
    options = auth_client_options_factory()
    base_url = "https://api.example.com"

    mock_client = MagicMock()
    mock_client.request = MagicMock()
    mock_pool_manager.return_value = mock_client

    mock_get_headers.return_value = {
        "Authorization": "Bearer test.token",
        "Content-Type": "application/json",
    }

    client = Urllib3AuthClient(options, base_url)

    # Execute
    test_body = {"data": "test"}
    client.request("POST", "/test", body=test_body)

    # Verify
    actual_headers = mock_client.request.call_args[1]["headers"]
    assert actual_headers.get("Content-Type") == "application/json"
