import pytest

from cdp.auth.clients.urllib3.client import Urllib3AuthClientOptions


@pytest.fixture
def auth_client_options_factory():
    """Create and return a factory for Urllib3AuthClientOptions fixtures.

    Returns:
        callable: A factory function that creates Urllib3AuthClientOptions instances

    """

    def _create_auth_client_options(
        api_key_id="test-key-id",
        api_key_secret="test-secret",
        wallet_secret="test-wallet-key",
    ):
        return Urllib3AuthClientOptions(
            api_key_id=api_key_id,
            api_key_secret=api_key_secret,
            wallet_secret=wallet_secret,
        )

    return _create_auth_client_options
