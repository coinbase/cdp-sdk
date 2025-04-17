"""CDP SDK Auth Utils package."""

from .http import GetAuthHeadersOptions, get_auth_headers
from .jwt import JwtOptions, WalletJwtOptions, generate_jwt, generate_wallet_jwt

__all__ = [
    # JWT utils
    "generate_jwt",
    "generate_wallet_jwt",
    "JwtOptions",
    "WalletJwtOptions",
    # HTTP utils
    "get_auth_headers",
    "GetAuthHeadersOptions",
]
