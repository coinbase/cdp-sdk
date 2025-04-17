import base64
import random
import time
import uuid
from datetime import datetime
from typing import Any
from urllib.parse import urlparse

import jwt
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import ec, ed25519
from pydantic import BaseModel, Field, field_validator


class JwtOptions(BaseModel):
    r"""Configuration options for JWT generation.

    This class holds all necessary parameters for generating a JWT token
    for authenticating with Coinbase's REST APIs. It supports both EC (ES256)
    and Ed25519 (EdDSA) keys.

    Attributes:
        api_key_id - The API key ID
            Examples:
                'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
                'organizations/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx/apiKeys/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
        api_key_secret - The API key secret
            Examples:
                'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx==' (Edwards key (Ed25519))
                '-----BEGIN EC PRIVATE KEY-----\\n...\\n...\\n...==\\n-----END EC PRIVATE KEY-----\\n' (EC key (ES256))
        request_method - The HTTP method for the request (e.g. 'GET', 'POST')
        request_host - The host for the request (e.g. 'api.cdp.coinbase.com')
        request_path - The path for the request (e.g. '/platform/v1/wallets')
        expires_in - Optional expiration time in seconds (defaults to 120)

    """

    api_key_id: str = Field(..., description="The API key ID")
    api_key_secret: str = Field(..., description="The API key secret")
    request_method: str = Field(..., description="The HTTP method for the request")
    request_host: str = Field(..., description="The host for the request")
    request_path: str = Field(..., description="The path for the request")
    expires_in: int | None = Field(120, description="Optional expiration time in seconds")

    @field_validator("request_method")
    @classmethod
    def validate_request_method(cls, v: str) -> str:
        """Validate the HTTP request method.

        Args:
            v: The request method to validate

        Returns:
            The validated request method in uppercase

        Raises:
            ValueError: If the request method is invalid

        """
        valid_methods = ["GET", "POST", "PUT", "DELETE", "PATCH"]
        upper_method = v.upper()
        if upper_method not in valid_methods:
            raise ValueError(f"Invalid request method. Must be one of: {', '.join(valid_methods)}")
        return upper_method


class WalletJwtOptions(BaseModel):
    """Configuration options for Wallet Auth JWT generation.

    This class holds all necessary parameters for generating a Wallet Auth JWT
    for authenticating with endpoints that require wallet authentication.

    Attributes:
        wallet_auth_key - The wallet authentication key
        request_method - The HTTP method for the request (e.g. 'GET', 'POST')
        request_host - The host for the request (e.g. 'api.cdp.coinbase.com')
        request_path - The path for the request (e.g. '/platform/v1/wallets/{wallet_id}/addresses')
        request_data - The request data for the request (e.g. { "wallet_id": "1234567890" })

    """

    wallet_auth_key: str = Field(..., description="The wallet authentication key")
    request_method: str = Field(..., description="The HTTP method for the request")
    request_host: str = Field(..., description="The host for the request")
    request_path: str = Field(..., description="The path for the request")
    request_data: dict[str, Any] = Field(..., description="The request data")

    @field_validator("request_method")
    @classmethod
    def validate_request_method(cls, v: str) -> str:
        """Validate the HTTP request method.

        Args:
            v: The request method to validate

        Returns:
            The validated request method in uppercase

        Raises:
            ValueError: If the request method is invalid

        """
        valid_methods = ["GET", "POST", "PUT", "DELETE", "PATCH"]
        upper_method = v.upper()
        if upper_method not in valid_methods:
            raise ValueError(f"Invalid request method. Must be one of: {', '.join(valid_methods)}")
        return upper_method


def generate_jwt(options: JwtOptions) -> str:
    """Generate a JWT (Bearer token) for authenticating with Coinbase's REST APIs.

    Supports both EC (ES256) and Ed25519 (EdDSA) keys.

    Args:
        options: The configuration options for generating the JWT

    Returns:
        The generated JWT (Bearer token) string

    Raises:
        ValueError: If required parameters are missing, invalid, or if JWT signing fails

    """
    # Validate required parameters
    if not options.api_key_id:
        raise ValueError("Key ID is required")
    if not options.api_key_secret:
        raise ValueError("Private key is required")
    if not all([options.request_method, options.request_host, options.request_path]):
        raise ValueError("Request details (method, host, path) are required")

    try:
        # Parse the private key
        private_key = _parse_private_key(options.api_key_secret)

        # Determine algorithm based on key type
        if isinstance(private_key, ec.EllipticCurvePrivateKey):
            algorithm = "ES256"
        elif isinstance(private_key, ed25519.Ed25519PrivateKey):
            algorithm = "EdDSA"
        else:
            raise ValueError("Unsupported key type")

        # Create header with nonce
        header = {
            "alg": algorithm,
            "kid": options.api_key_id,
            "typ": "JWT",
            "nonce": _generate_nonce(),
        }

        # Build the URI claim
        parsed_url = urlparse(f"{options.request_host}{options.request_path}")
        uri = f"{options.request_method} {parsed_url.netloc}{parsed_url.path}"

        # Create claims with timing
        now = int(time.time())
        expires_in = options.expires_in or 120  # Default to 120 seconds

        claims = {
            "sub": options.api_key_id,
            "iss": "cdp",
            "aud": ["cdp_service"],
            "nbf": now,
            "exp": now + expires_in,
            "uris": [uri],
        }

        # Generate the JWT
        return jwt.encode(claims, private_key, algorithm=algorithm, headers=header)

    except Exception as error:
        raise ValueError(f"Failed to generate JWT: {error!s}") from error


def generate_wallet_jwt(options: WalletJwtOptions) -> str:
    """Build a wallet authentication JWT for the given API endpoint URL.

    Used for authenticating with specific endpoints that require wallet authentication.

    Args:
        options: The configuration options for generating the wallet auth JWT

    Returns:
        The generated JWT (Bearer token) string

    Raises:
        ValueError: If required parameters are missing or if JWT signing fails

    """
    if not options.wallet_auth_key:
        raise ValueError("Server Wallet Secret is not defined")

    uri = f"{options.request_method} {options.request_host}{options.request_path}"
    now = int(datetime.now().timestamp())

    claims = {"uris": [uri], "iat": now, "nbf": now, "jti": str(uuid.uuid4())}

    if options.request_data:
        claims["req"] = options.request_data

    try:
        der_bytes = serialization.load_der_private_key(
            base64.b64decode(options.wallet_auth_key), password=None
        )

        # Generate and sign the token
        token = jwt.encode(
            claims,
            der_bytes,  # Use the private key directly
            algorithm="ES256",
            headers={"typ": "JWT"},
        )

        return token

    except Exception as error:
        raise ValueError(f"Could not create the EC key: {error!s}") from error


def _parse_private_key(
    key_data: str,
) -> ec.EllipticCurvePrivateKey | ed25519.Ed25519PrivateKey:
    """Parse a private key from PEM or base64 format.

    Args:
        key_data: The private key data in either PEM (EC) or base64 (Ed25519) format

    Returns:
        The parsed private key object

    Raises:
        ValueError: If the key cannot be parsed or is of an unsupported type

    """
    # First try parsing as PEM (EC key)
    try:
        key = serialization.load_pem_private_key(key_data.encode(), password=None)
        if isinstance(key, ec.EllipticCurvePrivateKey):
            return key
    except Exception:
        pass

    # Try parsing as base64 (Ed25519 key)
    try:
        decoded = base64.b64decode(key_data)
        if len(decoded) == 64:
            # Ed25519 keys are 64 bytes - first 32 is seed, second 32 is public key
            seed = decoded[:32]
            return ed25519.Ed25519PrivateKey.from_private_bytes(seed)
    except Exception:
        pass

    raise ValueError("Key must be either PEM EC key or base64 Ed25519 key")


def _generate_nonce() -> str:
    """Generate a random nonce for the JWT header.

    Returns:
        A 16-character random string of digits

    """
    return "".join(random.choices("0123456789", k=16))
