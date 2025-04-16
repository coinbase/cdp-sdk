from typing import Any, Dict, Optional
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
    """

    api_key_id: str = Field(..., description="The API key ID")
    api_key_secret: str = Field(..., description="The API key secret")
    request_method: str = Field(..., description="The HTTP method")
    request_host: str = Field(..., description="The request host")
    request_path: str = Field(..., description="The request path")
    request_body: Optional[Dict[str, Any]] = Field(
        None, description="Optional request body"
    )
    wallet_secret: Optional[str] = Field(None, description="Optional wallet secret")
    source: Optional[str] = Field(None, description="Optional source identifier")
    source_version: Optional[str] = Field(None, description="Optional source version")
    expires_in: Optional[int] = Field(
        None, description="Optional JWT expiration time in seconds"
    )


def get_auth_headers(options: GetAuthHeadersOptions) -> Dict[str, str]:
    """Get authentication headers for a request.

    Args:
        options - The authentication header options

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
    """Determines if the request requires wallet authentication.

    Args:
        method - The HTTP method of the request
        path - The URL path of the request

    Returns:
        True if wallet authentication is required, False otherwise
    """
    if "/accounts" in path:
        if method == "POST" or method == "DELETE":
            return True
    return False


def _get_correlation_data(
    source: Optional[str] = None, source_version: Optional[str] = None
) -> str:
    """Returns encoded correlation data including the SDK version and language.

    Args:
        source - Optional source identifier
        source_version - Optional source version

    Returns:
        Encoded correlation data as a query string
    """
    from importlib.metadata import version

    VERSION = version("cdp-sdk")

    data = {
        "sdk_version": VERSION,
        "sdk_language": "python",
        "source": source or "sdk-auth",
    }
    if source_version:
        data["source_version"] = source_version

    return ",".join(f"{key}={value}" for key, value in data.items())
