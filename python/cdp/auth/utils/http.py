from typing import Any

from pydantic import BaseModel, Field

from cdp.auth.utils.jwt import (
    JwtOptions,
    WalletJwtOptions,
    generate_jwt,
    generate_wallet_jwt,
)


class GetAuthHeadersOptions(BaseModel):
    """Options for generating authentication headers.

    Attributes:
        api_key_id - The API key ID
        api_key_secret - The API key secret
        request_method - The HTTP method
        request_host - The request host
        request_path - The request path
        [request_body] - Optional request body
        [wallet_secret] - Optional wallet secret for wallet authentication
        [source] - Optional source identifier
        [source_version] - Optional source version
        [expires_in] - Optional JWT expiration time in seconds
        [audience] - Optional audience claim for the JWT

    """

    api_key_id: str = Field(..., description="The API key ID")
    api_key_secret: str = Field(..., description="The API key secret")
    request_method: str = Field(..., description="The HTTP method")
    request_host: str = Field(..., description="The request host")
    request_path: str = Field(..., description="The request path")
    request_body: dict[str, Any] | None = Field(None, description="Optional request body")
    wallet_secret: str | None = Field(None, description="Optional wallet secret")
    source: str | None = Field(None, description="Optional source identifier")
    source_version: str | None = Field(None, description="Optional source version")
    expires_in: int | None = Field(None, description="Optional JWT expiration time in seconds")
    audience: list[str] | None = Field(None, description="Optional audience claim for the JWT")


def get_auth_headers(options: GetAuthHeadersOptions) -> dict[str, str]:
    """Get authentication headers for a request.

    Args:
        options: The authentication header options

    Returns:
        Dict with authentication headers

    """
    headers = {}

    # Create JWT options
    jwt_options = JwtOptions(
        api_key_id=options.api_key_id,
        api_key_secret=options.api_key_secret,
        request_method=options.request_method,
        request_host=options.request_host,
        request_path=options.request_path,
        expires_in=options.expires_in,
        audience=options.audience,
    )

    # Generate and add JWT token
    jwt_token = generate_jwt(jwt_options)
    headers["Authorization"] = f"Bearer {jwt_token}"
    headers["Content-Type"] = "application/json"

    # Add wallet auth if needed
    if _requires_wallet_auth(options.request_method, options.request_path):
        if not options.wallet_secret:
            raise ValueError(
                "Wallet Secret not configured. Please set the CDP_WALLET_SECRET environment variable, or pass it as an option to the CdpClient constructor.",
            )

        wallet_auth_token = generate_wallet_jwt(
            WalletJwtOptions(
                wallet_auth_key=options.wallet_secret,
                request_method=options.request_method,
                request_host=options.request_host,
                request_path=options.request_path,
                request_data=options.request_body or {},
            )
        )
        headers["X-Wallet-Auth"] = wallet_auth_token

    # Add correlation data
    headers["Correlation-Context"] = _get_correlation_data(
        options.source,
        options.source_version,
    )

    return headers


def _requires_wallet_auth(method: str, path: str) -> bool:
    """Determine if the request requires wallet authentication.

    Args:
        method: The HTTP method of the request
        path: The URL path of the request

    Returns:
        True if wallet authentication is required, False otherwise

    """
    return "/accounts" in path and (method == "POST" or method == "DELETE")


def _get_correlation_data(source: str | None = None, source_version: str | None = None) -> str:
    """Return encoded correlation data including the SDK version and language.

    Args:
        source: Optional source identifier
        source_version: Optional source version

    Returns:
        Encoded correlation data as a query string

    """
    from importlib.metadata import version

    sdk_version = version("cdp-sdk")

    data = {
        "sdk_version": sdk_version,
        "sdk_language": "python",
        "source": source or "sdk-auth",
    }
    if source_version:
        data["source_version"] = source_version

    return ",".join(f"{key}={value}" for key, value in data.items())
