import base64
from urllib.parse import urlparse

import jwt as jwt_lib
import pytest
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import ec, ed25519
from pydantic import ValidationError

# Import JWT utilities from the utils package
from cdp.auth.utils.jwt import (
    JwtOptions,
    _generate_nonce,
    _parse_private_key,
    generate_jwt,
)


# Test fixtures for common test data
@pytest.fixture
def ec_private_key():
    """Fixture that generates an EC private key in PEM format for testing.

    Returns:
        str: PEM-encoded EC private key

    """
    private_key = ec.generate_private_key(ec.SECP256K1())
    pem = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    )
    return pem.decode()


@pytest.fixture
def ed25519_private_key():
    """Fixture that generates an Ed25519 private key in base64 format for testing.

    Returns:
        str: Base64-encoded Ed25519 private key

    """
    private_key = ed25519.Ed25519PrivateKey.generate()
    private_bytes = private_key.private_bytes(
        encoding=serialization.Encoding.Raw,
        format=serialization.PrivateFormat.Raw,
        encryption_algorithm=serialization.NoEncryption(),
    )
    public_bytes = private_key.public_key().public_bytes(
        encoding=serialization.Encoding.Raw,
        format=serialization.PublicFormat.Raw,
    )
    return base64.b64encode(private_bytes + public_bytes).decode()


@pytest.fixture
def jwt_options(jwt_options_factory):
    """Fixture that provides basic JWT options for testing.

    Returns:
        JwtOptions: Basic JWT options for testing

    """
    return jwt_options_factory()


@pytest.fixture
def websocket_jwt_options(websocket_jwt_options_factory):
    """Fixture that provides JWT options for WebSocket testing with null request parameters.

    Returns:
        JwtOptions: JWT options for WebSocket testing

    """
    return websocket_jwt_options_factory()


def test_parse_private_key_ec(ec_private_key_factory):
    """Test parsing an EC private key."""
    # Setup
    key_data = ec_private_key_factory()

    # Execute
    key = _parse_private_key(key_data)

    # Verify
    assert isinstance(key, ec.EllipticCurvePrivateKey)


def test_parse_private_key_ed25519(ed25519_private_key_factory):
    """Test parsing an Ed25519 private key."""
    # Setup
    key_data = ed25519_private_key_factory()

    # Execute
    key = _parse_private_key(key_data)

    # Verify
    assert isinstance(key, ed25519.Ed25519PrivateKey)


def test_parse_private_key_invalid():
    """Test parsing an invalid private key."""
    # Execute & Verify
    with pytest.raises(ValueError):
        _parse_private_key("invalid-key-data")


def test_generate_nonce():
    """Test nonce generation."""
    # Execute
    nonce1 = _generate_nonce()
    nonce2 = _generate_nonce()

    # Verify
    assert isinstance(nonce1, str)
    assert len(nonce1) == 16
    assert nonce1.isdigit()
    assert nonce1 != nonce2  # Ensure randomness


def test_generate_jwt_ec(ec_private_key_factory, jwt_options_factory):
    """Test JWT generation with EC key."""
    # Setup
    key_data = ec_private_key_factory()
    options = jwt_options_factory(api_key_secret=key_data)

    # Execute
    token = generate_jwt(options)

    # Verify
    decoded = jwt_lib.decode(token, options={"verify_signature": False})
    assert decoded["sub"] == options.api_key_id
    assert decoded["iss"] == "cdp"
    assert decoded["aud"] == ["cdp_service"]
    assert isinstance(decoded["nbf"], int)
    assert isinstance(decoded["exp"], int)
    assert decoded["exp"] - decoded["nbf"] == options.expires_in

    parsed_url = urlparse(f"{options.request_host}{options.request_path}")
    expected_uri = f"{options.request_method} {parsed_url.netloc}{parsed_url.path}"
    assert decoded["uris"] == [expected_uri]


def test_generate_jwt_ed25519(ed25519_private_key_factory, jwt_options_factory):
    """Test JWT generation with Ed25519 key."""
    # Setup
    key_data = ed25519_private_key_factory()
    options = jwt_options_factory(api_key_secret=key_data)

    # Execute
    token = generate_jwt(options)

    # Verify
    decoded = jwt_lib.decode(token, options={"verify_signature": False})
    assert decoded["sub"] == options.api_key_id
    assert decoded["iss"] == "cdp"
    assert "uris" in decoded


def test_generate_websocket_jwt_ec(ec_private_key_factory, websocket_jwt_options_factory):
    """Test WebSocket JWT generation with EC key and null request parameters."""
    # Setup
    key_data = ec_private_key_factory()
    options = websocket_jwt_options_factory(api_key_secret=key_data)

    # Execute
    token = generate_jwt(options)

    # Verify
    decoded = jwt_lib.decode(token, options={"verify_signature": False})
    assert decoded["sub"] == options.api_key_id
    assert decoded["iss"] == "cdp"
    assert decoded["aud"] == ["cdp_service"]
    assert isinstance(decoded["nbf"], int)
    assert isinstance(decoded["exp"], int)
    assert decoded["exp"] - decoded["nbf"] == options.expires_in
    # WebSocket JWTs should not have uris claim
    assert "uris" not in decoded


def test_generate_websocket_jwt_ed25519(ed25519_private_key_factory, websocket_jwt_options_factory):
    """Test WebSocket JWT generation with Ed25519 key and null request parameters."""
    # Setup
    key_data = ed25519_private_key_factory()
    options = websocket_jwt_options_factory(api_key_secret=key_data)

    # Execute
    token = generate_jwt(options)

    # Verify
    decoded = jwt_lib.decode(token, options={"verify_signature": False})
    assert decoded["sub"] == options.api_key_id
    assert decoded["iss"] == "cdp"
    # WebSocket JWTs should not have uris claim
    assert "uris" not in decoded


def test_invalid_request_parameters_mix():
    """Test that having a mix of null and non-null request parameters raises an error."""
    # Setup
    options = JwtOptions(
        api_key_id="test-key-id",
        api_key_secret="dummy-secret",
        request_method="GET",  # Specified
        request_host=None,  # Null
        request_path="/test",  # Specified
    )

    # Execute & Verify
    with pytest.raises(
        ValueError, match="Either all request details.*must be provided, or all must be None"
    ):
        generate_jwt(options)


@pytest.mark.parametrize(
    "field,value,error_message",
    [
        ("api_key_id", "", "Key ID is required"),
        ("api_key_secret", "", "Private key is required"),
        ("request_method", "", "Invalid request method"),
    ],
)
def test_generate_jwt_missing_params(jwt_options_factory, field, value, error_message):
    """Test JWT generation with missing parameters."""
    # Setup & Execute & Verify
    if field == "request_method":
        with pytest.raises(ValidationError, match=error_message):
            jwt_options_factory(**{field: value})
    else:
        options = jwt_options_factory(**{field: value})
        with pytest.raises(ValueError, match=error_message):
            generate_jwt(options)


def test_generate_jwt_default_expiry(ec_private_key_factory, jwt_options_factory):
    """Test JWT generation with default expiry time."""
    # Setup
    key_data = ec_private_key_factory()
    options = jwt_options_factory(
        api_key_secret=key_data,
        expires_in=None,  # Test default expiry
    )

    # Execute
    token = generate_jwt(options)

    # Verify
    decoded = jwt_lib.decode(token, options={"verify_signature": False})
    assert decoded["exp"] - decoded["nbf"] == 120  # Default expiry


def test_generate_jwt_custom_expiry(ec_private_key_factory, jwt_options_factory):
    """Test JWT generation with custom expiry time."""
    # Setup
    key_data = ec_private_key_factory()
    options = jwt_options_factory(
        api_key_secret=key_data,
        expires_in=300,  # Custom expiry
    )

    # Execute
    token = generate_jwt(options)

    # Verify
    decoded = jwt_lib.decode(token, options={"verify_signature": False})
    assert decoded["exp"] - decoded["nbf"] == 300
