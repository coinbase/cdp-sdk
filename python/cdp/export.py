import base64

import base58
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding, rsa
from solders.keypair import Keypair


def generate_export_encryption_key_pair():
    """Generate a new RSA key pair with 4096-bit private key.

    - Private key in TraditionalOpenSSL (PKCS1) DER format
    - Public key in PKIX/SPKI DER format

    Returns:
        tuple: (public_key_base64, private_key_base64)

    """
    # Generate private key
    private_key = rsa.generate_private_key(
        public_exponent=65537, key_size=4096, backend=default_backend()
    )

    # Get public key
    public_key = private_key.public_key()

    # Serialize private key to TraditionalOpenSSL (PKCS1) DER format
    private_key_der = private_key.private_bytes(
        encoding=serialization.Encoding.DER,
        format=serialization.PrivateFormat.TraditionalOpenSSL,
        encryption_algorithm=serialization.NoEncryption(),
    )

    # Serialize public key to SPKI DER format
    public_key_der = public_key.public_bytes(
        encoding=serialization.Encoding.DER, format=serialization.PublicFormat.SubjectPublicKeyInfo
    )

    # Convert to base64
    private_key_b64 = base64.b64encode(private_key_der).decode("utf-8")
    public_key_b64 = base64.b64encode(public_key_der).decode("utf-8")

    return public_key_b64, private_key_b64


def decrypt_with_private_key(b64_private_key: str, b64_cipher: str) -> str:
    """Decrypt a ciphertext using RSA-OAEP-SHA256.

    Args:
        b64_private_key: The base64-encoded private key in TraditionalOpenSSL (PKCS1) DER format
        b64_cipher: The base64-encoded ciphertext

    Returns:
        str: The decrypted key as a hex string

    Raises:
        Exception: If decryption fails

    """
    try:
        # Decode base64 private key
        private_key_der = base64.b64decode(b64_private_key)

        # Load private key from TraditionalOpenSSL (PKCS1) DER format
        private_key = serialization.load_der_private_key(
            private_key_der, password=None, backend=default_backend()
        )

        # Decode base64 ciphertext
        ciphertext = base64.b64decode(b64_cipher)

        # Decrypt using RSA-OAEP-SHA256
        plaintext = private_key.decrypt(
            ciphertext,
            padding.OAEP(
                mgf=padding.MGF1(algorithm=hashes.SHA256()), algorithm=hashes.SHA256(), label=None
            ),
        )

        # Convert to hex
        return plaintext.hex()

    except Exception as e:
        raise Exception(f"Decryption failed: {e!s}") from e


def format_solana_private_key(private_key: str) -> str:
    """Format a private key to a base58 string for easy import into Solana wallet apps.

    Args:
        private_key: The private key as a hex string

    Returns:
        str: The formatted private key as a base58 string

    """
    decoded_hex = bytes.fromhex(private_key)
    keypair = Keypair.from_seed(decoded_hex)
    full_key = keypair.secret() + bytes(keypair.pubkey())
    return base58.b58encode(full_key).decode("utf-8")
