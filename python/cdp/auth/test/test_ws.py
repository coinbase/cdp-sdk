from unittest.mock import patch

from cdp.auth.utils.ws import (
    get_websocket_auth_headers,
)


@patch("cdp.auth.utils.ws.generate_jwt")
def test_get_websocket_auth_headers(mock_jwt, websocket_auth_options_factory):
    """Test getting WebSocket authentication headers."""
    # Setup
    mock_jwt.return_value = "mock.websocket.jwt.token"
    options = websocket_auth_options_factory()

    # Execute
    headers = get_websocket_auth_headers(options)

    # Verify
    assert headers["Authorization"] == "Bearer mock.websocket.jwt.token"
    assert headers["Content-Type"] == "application/json"
    assert "X-Wallet-Auth" not in headers

    # Verify JWT was called with correct parameters
    mock_jwt.assert_called_once()
    jwt_options = mock_jwt.call_args[0][0]
    assert jwt_options.api_key_id == options.api_key_id
    assert jwt_options.api_key_secret == options.api_key_secret
    assert jwt_options.request_method is None
    assert jwt_options.request_host is None
    assert jwt_options.request_path is None


@patch("cdp.auth.utils.ws.generate_jwt")
def test_websocket_headers_with_custom_expiry(mock_jwt, websocket_auth_options_factory):
    """Test WebSocket headers with custom expiration time."""
    # Setup
    mock_jwt.return_value = "mock.websocket.jwt.token"
    custom_expiry = 300
    options = websocket_auth_options_factory()
    options.expires_in = custom_expiry

    # Execute
    get_websocket_auth_headers(options)

    # Verify
    mock_jwt.assert_called_once()
    jwt_options = mock_jwt.call_args[0][0]
    assert jwt_options.expires_in == custom_expiry


@patch("cdp.auth.utils.ws.generate_jwt")
@patch("cdp.auth.utils.ws._get_correlation_data")
def test_correlation_context(mock_correlation, mock_jwt, websocket_auth_options_factory):
    """Test including correlation context in WebSocket headers."""
    # Setup
    mock_jwt.return_value = "mock.websocket.jwt.token"
    mock_correlation.return_value = "test-correlation-data"
    options = websocket_auth_options_factory()
    options.source = "custom-source"
    options.source_version = "1.0.0"

    # Execute
    headers = get_websocket_auth_headers(options)

    # Verify
    mock_correlation.assert_called_once_with(options.source, options.source_version)
    assert headers["Correlation-Context"] == "test-correlation-data"
