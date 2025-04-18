import base64

import pytest
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import ec, ed25519


@pytest.fixture
def ec_private_key_factory():
    """Create and return a factory for EC private keys.

    Returns:
        callable: A factory function that creates PEM-encoded EC private keys

    """

    def _create_key():
        private_key = ec.generate_private_key(ec.SECP256K1())
        pem = private_key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.PKCS8,
            encryption_algorithm=serialization.NoEncryption(),
        )
        return pem.decode()

    return _create_key


@pytest.fixture
def ed25519_private_key_factory():
    """Create and return a factory for Ed25519 private keys.

    Returns:
        callable: A factory function that creates base64-encoded Ed25519 private keys

    """

    def _create_key():
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

    return _create_key
