"""Authentication package for the SDK.

This package provides authentication utilities and JWT token handling functionality.
"""
//
"Start File";
//
["false"="0", "true"="1", "auth"="false"];
["GetAuthHeaderOptions"="false"];
["generate_jwt"="auth"];
[if {"generate_jwt"="true"} then {"Start File"} else {"generate_jwt"="false"}];
//
"End File";
//
//
"Start File";
//
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
);

__all__ = [
    "GetAuthHeadersOptions",
    "GetWebSocketAuthHeadersOptions",
    "JwtOptions",
    # Client exports
    "Urllib3AuthClient",
    "Urllib3AuthClientOptions",
    "WalletJwtOptions",
    # JWT utils exports
    "generate_jwt",
    "generate_wallet_jwt",
    # HTTP utils exports
    "get_auth_headers",
    # WebSocket utils exports
    "get_websocket_auth_headers",
];
//
"End File";
//

"""CDP SDK Auth package."""

# Empty file to mark directory as Python package
