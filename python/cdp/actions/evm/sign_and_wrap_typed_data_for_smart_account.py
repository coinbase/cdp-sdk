"""Sign and wrap EIP-712 typed data for smart accounts.

This module provides functionality for signing EIP-712 typed data with Coinbase Smart Wallets,
handling the specific requirements of the smart contract implementation.
"""

from typing import Any

from eth_abi import encode
from web3 import Web3

from cdp.api_clients import ApiClients


class SignAndWrapTypedDataForSmartAccountOptions:
    """Options for signing and wrapping EIP-712 typed data with a smart account."""

    def __init__(
        self,
        smart_account: Any,
        chain_id: int,
        typed_data: dict[str, Any],
        owner_index: int = 0,
        idempotency_key: str | None = None,
    ):
        """Initialize the options.

        Args:
            smart_account: The smart account to sign with
            chain_id: The chain ID for the signature (used for replay protection)
            typed_data: The EIP-712 typed data message to sign
            owner_index: The index of the owner to sign with (defaults to 0)
            idempotency_key: Optional idempotency key for the signing request

        """
        self.smart_account = smart_account
        self.chain_id = chain_id
        self.typed_data = typed_data
        self.owner_index = owner_index
        self.idempotency_key = idempotency_key


class SignAndWrapTypedDataForSmartAccountResult:
    """Result of signing and wrapping typed data for a smart account."""

    def __init__(self, signature: str):
        """Initialize the result.

        Args:
            signature: The signature ready for smart contract use

        """
        self.signature = signature


async def sign_and_wrap_typed_data_for_smart_account(
    api_clients: ApiClients,
    options: SignAndWrapTypedDataForSmartAccountOptions,
) -> SignAndWrapTypedDataForSmartAccountResult:
    """Sign and wrap an EIP-712 message for a smart account using the required Coinbase Smart Wallet signature format.

    **Important: Coinbase Smart Wallet Contract Requirements**

    Due to the Coinbase Smart Wallet contract implementation (ERC-1271), CDP Smart Wallets have
    specific requirements for EIP-712 message signing:

    1. **Replay-Safe Hashing**: All typed messages must be wrapped in a replay-safe hash that
       includes the chain ID and smart account address. This prevents the same signature from
       being valid across different chains or accounts.

    2. **Signature Wrapping**: The resulting signature must be wrapped in a `SignatureWrapper`
       struct that identifies which owner signed and contains the signature data in the format
       expected by the smart contract's `isValidSignature()` method.

    This function handles both requirements automatically, making it safe and convenient for
    developers to sign EIP-712 messages with CDP Smart Wallets.

    Args:
        api_clients: The CDP API clients instance
        options: Parameters for signing and wrapping the EIP-712 message

    Returns:
        SignAndWrapTypedDataForSmartAccountResult: The signature that can be used with smart contracts

    Raises:
        ValueError: If the smart account has no owners or the owner index is invalid
        Exception: If the signing operation fails

    Example:
        ```python
        from cdp.actions.evm.sign_and_wrap_typed_data_for_smart_account import (
            sign_and_wrap_typed_data_for_smart_account,
            SignAndWrapTypedDataForSmartAccountOptions,
        )

        options = SignAndWrapTypedDataForSmartAccountOptions(
            smart_account=smart_account,
            chain_id=1,
            typed_data={
                "domain": {
                    "name": "Permit2",
                    "chainId": 1,
                    "verifyingContract": "0x000000000022D473030F116dDEE9F6B43aC78BA3",
                },
                "types": {
                    "EIP712Domain": [
                        {"name": "name", "type": "string"},
                        {"name": "chainId", "type": "uint256"},
                        {"name": "verifyingContract", "type": "address"},
                    ],
                    "PermitTransferFrom": [
                        {"name": "permitted", "type": "TokenPermissions"},
                        {"name": "spender", "type": "address"},
                        {"name": "nonce", "type": "uint256"},
                        {"name": "deadline", "type": "uint256"},
                    ],
                    "TokenPermissions": [
                        {"name": "token", "type": "address"},
                        {"name": "amount", "type": "uint256"},
                    ],
                },
                "primaryType": "PermitTransferFrom",
                "message": {
                    "permitted": {
                        "token": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
                        "amount": "1000000",
                    },
                    "spender": "0xFfFfFfFFfFFfFFfFFfFFFFFffFFFffffFfFFFfFf",
                    "nonce": "0",
                    "deadline": "1717123200",
                },
            },
        )

        result = await sign_and_wrap_typed_data_for_smart_account(api_clients, options)
        print(f"Signature: {result.signature}")
        ```

    """
    # Validate that the smart account has owners
    if not hasattr(options.smart_account, "owners") or not options.smart_account.owners:
        raise ValueError("Smart account must have owners")

    if options.owner_index >= len(options.smart_account.owners):
        raise ValueError(f"Owner index {options.owner_index} out of range")

    # Create the replay-safe typed data
    replay_safe_typed_data = create_replay_safe_typed_data(
        typed_data=options.typed_data,
        chain_id=options.chain_id,
        smart_account_address=options.smart_account.address,
    )

    # Sign the replay-safe typed data with the smart account owner
    owner = options.smart_account.owners[options.owner_index]

    # Convert typed data to the format expected by the API
    from cdp.openapi_client.models.eip712_domain import EIP712Domain
    from cdp.openapi_client.models.eip712_message import EIP712Message

    eip712_message = EIP712Message(
        domain=EIP712Domain(
            name=replay_safe_typed_data["domain"].get("name"),
            version=replay_safe_typed_data["domain"].get("version"),
            chain_id=replay_safe_typed_data["domain"].get("chainId"),
            verifying_contract=replay_safe_typed_data["domain"].get("verifyingContract"),
            salt=replay_safe_typed_data["domain"].get("salt"),
        ),
        types=replay_safe_typed_data["types"],
        primary_type=replay_safe_typed_data["primaryType"],
        message=replay_safe_typed_data["message"],
    )

    signature_response = await api_clients.evm_accounts.sign_evm_typed_data(
        address=owner.address,
        eip712_message=eip712_message,
        x_idempotency_key=options.idempotency_key,
    )

    # Wrap the signature in the format expected by the smart contract
    wrapped_signature = create_smart_account_signature_wrapper(
        signature_hex=signature_response.signature,
        owner_index=options.owner_index,
    )

    return SignAndWrapTypedDataForSmartAccountResult(signature=wrapped_signature)


def create_replay_safe_typed_data(
    typed_data: dict[str, Any],
    chain_id: int,
    smart_account_address: str,
) -> dict[str, Any]:
    """Create a replay-safe EIP-712 typed data structure by wrapping the original typed data with chain ID and smart account address.

    **Coinbase Smart Wallet Requirement**: Due to the Coinbase Smart Wallet contract's ERC-1271
    implementation, all EIP-712 messages must be wrapped in a replay-safe hash before signing.
    This prevents signature replay attacks across different chains or smart account addresses.

    The smart contract's `isValidSignature()` method expects signatures to be validated against
    this replay-safe hash, not the original message hash.

    Args:
        typed_data: The original EIP-712 typed data to make replay-safe
        chain_id: The chain ID for replay protection
        smart_account_address: The smart account address for additional context

    Returns:
        Dict[str, Any]: The EIP-712 typed data structure for the replay-safe hash

    """
    # Use eth_account's internal utilities to correctly hash EIP-712 data
    from eth_account._utils.encode_typed_data import hash_domain
    from eth_account._utils.encode_typed_data.encoding_and_hashing import hash_struct
    from eth_utils import keccak

    # Hash the EIP-712 data
    domain_hash = hash_domain(typed_data["domain"])
    message_hash = hash_struct(
        typed_data["primaryType"], typed_data["types"], typed_data["message"]
    )

    # Construct the final hash: keccak256("\x19\x01" || domainSeparator || messageHash)
    original_hash = keccak(b"\x19\x01" + domain_hash + message_hash).hex()

    # Ensure the hash has 0x prefix
    if not original_hash.startswith("0x"):
        original_hash = "0x" + original_hash

    # Create and return the replay-safe typed data structure
    return {
        "domain": {
            "name": "Coinbase Smart Wallet",
            "version": "1",
            "chainId": chain_id,
            "verifyingContract": Web3.to_checksum_address(smart_account_address),
        },
        "types": {
            "EIP712Domain": [
                {"name": "name", "type": "string"},
                {"name": "version", "type": "string"},
                {"name": "chainId", "type": "uint256"},
                {"name": "verifyingContract", "type": "address"},
            ],
            "CoinbaseSmartWalletMessage": [{"name": "hash", "type": "bytes32"}],
        },
        "primaryType": "CoinbaseSmartWalletMessage",
        "message": {
            "hash": original_hash,
        },
    }


def create_smart_account_signature_wrapper(
    signature_hex: str,
    owner_index: int,
) -> str:
    """Build a signature wrapper for Coinbase Smart Wallets by decomposing a hex signature into r, s, v components and encoding them in the format expected by the smart contract.

    All signatures on Coinbase Smart Wallets must be wrapped in this format to identify
    which owner signed and provide the signature data.

    Args:
        signature_hex: The hex signature to wrap (65 bytes: r + s + v)
        owner_index: The index of the owner that signed (from MultiOwnable.ownerAtIndex)

    Returns:
        str: The encoded signature wrapper in the format expected by the smart contract

    """
    # Remove 0x prefix if present
    if signature_hex.startswith("0x"):
        signature_hex = signature_hex[2:]

    # Decompose 65-byte hex signature into r (32 bytes), s (32 bytes), v (1 byte)
    r = bytes.fromhex(signature_hex[:64])  # First 32 bytes
    s = bytes.fromhex(signature_hex[64:128])  # Next 32 bytes
    v = int(signature_hex[128:130], 16)  # Last byte

    # Pack r, s, v into signature data
    signature_data = r + s + v.to_bytes(1, "big")

    # Define the SignatureWrapper struct ABI
    # struct SignatureWrapper {
    #   uint8 ownerIndex;
    #   bytes signatureData;
    # }
    signature_wrapper_abi = [
        {"name": "ownerIndex", "type": "uint8"},
        {"name": "signatureData", "type": "bytes"},
    ]

    # Encode the signature wrapper
    encoded_wrapper = encode(
        [t["type"] for t in signature_wrapper_abi], [owner_index, signature_data]
    )

    return "0x" + encoded_wrapper.hex()
