import json
import logging
from typing import Any
from urllib.parse import urlparse

import urllib3
from pydantic import BaseModel, Field

from cdp.auth.utils.http import GetAuthHeadersOptions, get_auth_headers

# Add logger
logger = logging.getLogger(__name__)


class Urllib3AuthClientOptions(BaseModel):
    r"""Configuration options for the authenticated HTTP client.

    Attributes:
        api_key_id - The API key ID
            Examples:
                'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
                'organizations/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx/apiKeys/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'

        api_key_secret - The API key secret
            Examples:
                'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx==' (Edwards key (Ed25519))
                '-----BEGIN EC PRIVATE KEY-----\n...\n...\n...==\n-----END EC PRIVATE KEY-----\n' (EC key (ES256))

        [wallet_secret] - Optional wallet secret for authenticating with endpoints that require wallet authentication.

        [source] - Optional source of the request

        [source_version] - Optional version of the source of the request

        [expires_in] - Optional expiration time in seconds (defaults to 120)

    """

    api_key_id: str = Field(..., description="The API key ID")
    api_key_secret: str = Field(..., description="The API key secret")
    wallet_secret: str | None = Field(None, description="Optional wallet secret")
    source: str | None = Field(None, description="Optional source identifier")
    source_version: str | None = Field(None, description="Optional source version")
    expires_in: int | None = Field(None, description="Optional JWT expiration time in seconds")


class Urllib3AuthClient:
    """HTTP client that automatically adds authentication headers."""

    def __init__(
        self,
        options: Urllib3AuthClientOptions,
        base_url: str,
        debug: bool = False,
    ):
        """Initialize the authenticated HTTP client.

        Args:
            options: The authentication configuration options
            base_url: The base URL for all requests
            debug: Whether to enable debug logging

        """
        self.options = options
        self.base_url = base_url.rstrip("/")
        self.client = urllib3.PoolManager()
        self.debug = debug

    def request(
        self,
        method: str,
        url: str,
        headers: dict[str, str] | None = None,
        body: dict[str, Any] | bytes | None = None,
        **kwargs: Any,
    ) -> urllib3.HTTPResponse:
        """Make an authenticated HTTP request.

        Args:
            method: The HTTP method
            url: The URL to request (relative or absolute)
            headers: Optional additional headers
            body: Optional request body (can be a dict for JSON or bytes)
            **kwargs: Additional arguments passed to urllib3.request()

        Returns:
            urllib3.HTTPResponse

        """
        # Handle relative URLs
        if not url.startswith("http"):
            url = f"{self.base_url}/{url.lstrip('/')}"

        # Initialize request headers and body
        request_headers = headers or {}
        body_dict = body if isinstance(body, dict) else {}
        body_bytes = json.dumps(body).encode("utf-8") if isinstance(body, dict) else body

        # Get auth headers
        parsed_url = urlparse(url)
        auth_headers = get_auth_headers(
            GetAuthHeadersOptions(
                api_key_id=self.options.api_key_id,
                api_key_secret=self.options.api_key_secret,
                request_method=method,
                request_host=parsed_url.netloc,
                request_path=parsed_url.path,
                request_body=body_dict,
                wallet_secret=self.options.wallet_secret,
                source=self.options.source,
                source_version=self.options.source_version,
                expires_in=self.options.expires_in,
            )
        )

        # Merge headers
        request_headers.update(auth_headers)

        if self.debug:
            logger.debug(
                "HTTP Request: %s %s\nHeaders: %s\nBody: %s",
                method,
                url,
                request_headers,
                body_bytes.decode("utf-8") if body_bytes else None,
            )

        response = self.client.request(
            method=method, url=url, headers=request_headers, body=body_bytes, **kwargs
        )

        if self.debug:
            logger.debug(
                "HTTP Response: %s\nHeaders: %s\nBody: %s",
                response.status,
                response.headers,
                response.data.decode("utf-8"),
            )

        return response
