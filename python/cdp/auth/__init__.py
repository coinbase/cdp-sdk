"""Authentication package for the SDK.

This package provides authentication utilities and JWT token handling functionality.
"""

from .clients.urllib3.client import Urllib3AuthClient, Urllib3AuthClientOptions
from .utils.http import GetAuthHeadersOptions, get_auth_headers
from .utils.jwt import (
    JwtOptions,
    WalletJwtOptions,
    generate_jwt,
    generate_wallet_jwt,
)
from .utils.ws import (
    GetWebSocketAuthHeadersOptions,
    get_websocket_auth_headers,
)

__all__ = [
    # JWT utils exports
    "generate_jwt",
    "generate_wallet_jwt",
    "JwtOptions",
    "WalletJwtOptions",
    # Client exports
    "Urllib3AuthClient",
    "Urllib3AuthClientOptions",
    # HTTP utils exports
    "get_auth_headers",
    "GetAuthHeadersOptions",
    # WebSocket utils exports
    "get_websocket_auth_headers",
    "GetWebSocketAuthHeadersOptions",
]

"""CDP SDK Auth package."""

# Empty file to mark directory as Python package
