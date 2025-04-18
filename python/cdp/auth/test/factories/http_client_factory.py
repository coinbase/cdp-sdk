from unittest.mock import MagicMock

import pytest


@pytest.fixture
def http_client_factory(http_response_factory):
    """Create and return a factory for mock HTTP clients.

    Args:
        http_response_factory: Factory for creating mock HTTP responses

    Returns:
        callable: A factory function that creates mock HTTP client objects

    """

    def _create_client(response=None):
        mock_client = MagicMock()
        mock_client.request = MagicMock()

        if response:
            mock_client.request.return_value = response
        else:
            mock_client.request.return_value = http_response_factory()

        return mock_client

    return _create_client
