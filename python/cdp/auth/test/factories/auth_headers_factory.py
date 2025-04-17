import pytest


@pytest.fixture
def auth_headers_factory():
    """Create and return a factory for authentication headers.

    Returns:
        callable: A factory function that creates auth header dictionaries

    """

    def _create_headers(
        token="test.token", content_type="application/json", additional_headers=None
    ):
        headers = {"Authorization": f"Bearer {token}", "Content-Type": content_type}
        if additional_headers:
            headers.update(additional_headers)
        return headers

    return _create_headers
