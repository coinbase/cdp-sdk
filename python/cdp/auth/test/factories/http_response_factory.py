from unittest.mock import MagicMock

import pytest


@pytest.fixture
def http_response_factory():
    """Create and return a factory for mock HTTP responses.

    Returns:
        callable: A factory function that creates mock HTTP response objects

    """

    def _create_response(
        status: int = 200,
        data: bytes = b'{"test": "data"}',
        headers: dict[str, str] | None = None,
    ):
        """Create a mock HTTP response object."""
        if not headers:
            headers = {"Content-Type": "application/json"}
        mock_response = MagicMock()
        mock_response.status = status
        mock_response.data = data
        mock_response.headers = headers
        return mock_response

    return _create_response
