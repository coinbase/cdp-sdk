from pydantic import BaseModel, Field

from cdp.auth.utils.http import _get_correlation_data
from cdp.auth.utils.jwt import JwtOptions, generate_jwt


class GetWebSocketAuthHeadersOptions(BaseModel):
    """Options for generating WebSocket authentication headers.

    Attributes:
        api_key_id - The API key ID
        api_key_secret - The API key secret
        [source] - Optional source identifier
        [source_version] - Optional source version
        [expires_in] - Optional JWT expiration time in seconds
        [audience] - Optional audience claim for the JWT

    """

    api_key_id: str = Field(..., description="The API key ID")
    api_key_secret: str = Field(..., description="The API key secret")
    source: str | None = Field(None, description="Optional source identifier")
    source_version: str | None = Field(None, description="Optional source version")
    expires_in: int | None = Field(None, description="Optional JWT expiration time in seconds")
    audience: list[str] | None = Field(None, description="Optional audience claim for the JWT")


def get_websocket_auth_headers(options: GetWebSocketAuthHeadersOptions) -> dict[str, str]:
    """Get authentication headers for a WebSocket connection.

    Args:
        options: The WebSocket authentication header options

    Returns:
        Dict with authentication headers

    """
    headers = {}

    # Create JWT options with null request parameters for WebSocket
    jwt_options = JwtOptions(
        api_key_id=options.api_key_id,
        api_key_secret=options.api_key_secret,
        request_method=None,
        request_host=None,
        request_path=None,
        expires_in=options.expires_in,
        audience=options.audience,
    )

    # Generate and add JWT token
    jwt_token = generate_jwt(jwt_options)
    headers["Authorization"] = f"Bearer {jwt_token}"
    headers["Content-Type"] = "application/json"

    # Add correlation data
    headers["Correlation-Context"] = _get_correlation_data(
        options.source,
        options.source_version,
    )

    return headers
