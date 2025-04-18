from unittest.mock import patch

import pytest

from cdp.auth.utils.http import (
    _get_correlation_data,
    _requires_wallet_auth,
    get_auth_headers,
)


@patch("cdp.auth.utils.http.generate_jwt")
def test_get_auth_headers(mock_jwt, auth_options_factory):
    """Test getting authentication headers."""
    # Setup
    mock_jwt.return_value = "mock.jwt.token"
    options = auth_options_factory()

    # Execute
    headers = get_auth_headers(options)

    # Verify
    assert headers["Authorization"] == "Bearer mock.jwt.token"
    assert headers["Content-Type"] == "application/json"
    assert "X-Wallet-Auth" not in headers


@patch("cdp.auth.utils.http.generate_jwt")
@patch("cdp.auth.utils.http.generate_wallet_jwt")
def test_get_auth_headers_with_wallet_auth(mock_wallet_jwt, mock_jwt, auth_options_factory):
    """Test creating headers with wallet authentication."""
    # Setup
    mock_jwt.return_value = "mock.jwt.token"
    mock_wallet_jwt.return_value = "mock.wallet.token"
    options = auth_options_factory(
        request_path="/v2/evm/accounts",
        request_method="POST",  # POST to accounts path requires wallet auth
        wallet_secret="test-wallet-key",
    )

    # Execute
    headers = get_auth_headers(options)

    # Verify
    assert headers["Authorization"] == "Bearer mock.jwt.token"
    assert "X-Wallet-Auth" in headers
    assert headers["X-Wallet-Auth"] == "mock.wallet.token"


@patch("cdp.auth.utils.http.generate_jwt")
def test_get_auth_headers_missing_wallet_auth(mock_jwt, auth_options_factory):
    """Test error when wallet auth is required but not provided."""
    # Setup
    mock_jwt.return_value = "mock.jwt.token"
    # POST to accounts path requires wallet auth
    options = auth_options_factory(request_method="POST", request_path="/accounts")

    # Execute & Verify
    with pytest.raises(
        ValueError,
        match="Wallet Secret not configured. Please set the CDP_WALLET_SECRET environment variable, or pass it as an option to the CdpClient constructor.",
    ):
        get_auth_headers(options)


@pytest.mark.parametrize(
    "request_method,request_path,expected",
    [
        ("POST", "/accounts", True),
        ("POST", "/any/123", False),
        ("PUT", "/accounts/123", False),
        ("PUT", "/any/123", False),
        ("DELETE", "/accounts/123", True),
        ("DELETE", "/any/123", False),
        ("GET", "/any/accounts", False),
        ("GET", "/any/path", False),
    ],
)
def test_requires_wallet_auth(request_method, request_path, expected):
    """Test wallet auth requirement detection."""
    # Execute & Verify
    assert _requires_wallet_auth(request_method, request_path) is expected


@pytest.mark.parametrize(
    "source,version,expected_source",
    [
        (None, None, "sdk-auth"),
        ("custom-source", "1.0.0", "custom-source"),
    ],
)
def test_get_correlation_data(source, version, expected_source):
    """Test correlation data generation."""
    # Execute
    data = _get_correlation_data(source, version)

    # Verify
    assert "sdk_version=" in data
    assert "sdk_language=python" in data
    assert f"source={expected_source}" in data

    if version:
        assert f"source_version={version}" in data
