import pytest

from cdp.auth.utils.http import GetAuthHeadersOptions


@pytest.fixture
def auth_options_factory():
    """Create and return a factory for GetAuthHeadersOptions fixtures.

    Returns:
        callable: A factory function that creates GetAuthHeadersOptions instances
    """

    def _create_options(
        api_key_id="test-key",
        api_key_secret="test-secret",
        request_method="GET",
        request_host="api.example.com",
        request_path="/test",
        wallet_secret=None,
    ):
        return GetAuthHeadersOptions(
            api_key_id=api_key_id,
            api_key_secret=api_key_secret,
            request_method=request_method,
            request_host=request_host,
            request_path=request_path,
            wallet_secret=wallet_secret,
        )

    return _create_options
