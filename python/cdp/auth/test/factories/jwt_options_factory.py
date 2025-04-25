import pytest

from cdp.auth.utils.jwt import JwtOptions


@pytest.fixture
def jwt_options_factory():
    """Create and return a factory for JwtOptions fixtures.

    Returns:
        callable: A factory function that creates JwtOptions instances

    """

    def _create_options(
        api_key_id="test-key-id",
        api_key_secret="dummy-secret",
        request_method="GET",
        request_host="https://api.cdp.coinbase.com",
        request_path="/v1/test",
        expires_in=120,
    ):
        return JwtOptions(
            api_key_id=api_key_id,
            api_key_secret=api_key_secret,
            request_method=request_method,
            request_host=request_host,
            request_path=request_path,
            expires_in=expires_in,
        )

    return _create_options


@pytest.fixture
def websocket_jwt_options_factory():
    """Create and return a factory for WebSocket JwtOptions fixtures with null request parameters.

    Returns:
        callable: A factory function that creates JwtOptions instances for WebSocket

    """

    def _create_options(
        api_key_id="test-key-id",
        api_key_secret="dummy-secret",
        expires_in=120,
    ):
        return JwtOptions(
            api_key_id=api_key_id,
            api_key_secret=api_key_secret,
            request_method=None,
            request_host=None,
            request_path=None,
            expires_in=expires_in,
        )

    return _create_options
