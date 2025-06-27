import asyncio
from typing import Any

import nest_asyncio
from eth_account.datastructures import SignedMessage, SignedTransaction
from eth_account.messages import SignableMessage, _hash_eip191_message, encode_typed_data
from eth_account.signers.base import BaseAccount
from eth_account.types import TransactionDictType
from eth_typing import Hash32

from cdp.evm_server_account import EvmServerAccount

# Apply nest-asyncio to allow nested event loops
nest_asyncio.apply()


def _run_async(coroutine):
    """Run an async coroutine synchronously.

    Args:
        coroutine: The coroutine to run

    Returns:
        Any: The result of the coroutine

    """
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
    return loop.run_until_complete(coroutine)


class EvmLocalAccount(BaseAccount):
    """A class compatible with eth_account's LocalAccount.

    This class wraps an EvmServerAccount and provides a LocalAccount interface.
    It may be used to sign transactions and messages for an EVM server account.

    Args:
        server_account (EvmServerAccount): The EVM server account to sign transactions and messages for.

    """

    def __init__(self, server_account: EvmServerAccount):
        """Initialize the EvmLocalAccount class.

        Args:
            server_account (EvmServerAccount): The EVM server account to sign transactions and messages for.

        """
        self._server_account = server_account

    @property
    def address(self) -> str:
        """Get the address of the EVM server account.

        Returns:
            str: The address of the EVM server account.

        """
        return self._server_account.address

    def unsafe_sign_hash(self, message_hash: Hash32) -> SignedMessage:
        """Sign a message hash.

        WARNING: Never sign a hash that you didn't generate,
        it can be an arbitrary transaction.

        Args:
            message_hash (Hash32): The 32-byte message hash to sign.

        Returns:
            SignedMessage: The signed message.

        """
        return _run_async(self._server_account.unsafe_sign_hash(message_hash))

    def sign_message(self, signable_message: SignableMessage) -> SignedMessage:
        """Sign a message.

        Args:
            signable_message (SignableMessage): The message to sign.

        Returns:
            SignedMessage: The signed message.

        """
        return _run_async(self._server_account.sign_message(signable_message))

    def sign_transaction(self, transaction_dict: TransactionDictType) -> SignedTransaction:
        """Sign a transaction.

        Args:
            transaction_dict (TransactionDictType): The transaction to sign.

        Returns:
            SignedTransaction: The signed transaction.

        """
        return _run_async(self._server_account.sign_transaction(transaction_dict))

    def sign_typed_data(
        self,
        domain_data: dict[str, Any] | None = None,
        message_types: dict[str, Any] | None = None,
        message_data: dict[str, Any] | None = None,
        full_message: dict[str, Any] | None = None,
    ) -> SignedMessage:
        """Sign typed data.

        Either provide a full message, or provide the domain data, message types, and message data.

        Args:
            domain_data (dict[str, Any], optional): The domain data. Defaults to None.
            message_types (dict[str, Any], optional): The message types. Defaults to None.
            message_data (dict[str, Any], optional): The message data. Defaults to None.
            full_message (dict[str, Any], optional): The full message. Defaults to None.

        Returns:
            SignedMessage: The signed message.

        """
        if full_message is not None:
            typed_data = full_message
        elif message_types is not None and message_data is not None:
            primary_types = list(message_types.keys() - {"EIP712Domain"})
            if not primary_types:
                raise ValueError("Could not infer primaryType from message_types")
            typed_data = {
                "domain": domain_data,
                "types": message_types,
                "primaryType": primary_types[0],
                "message": message_data,
            }
        else:
            raise ValueError(
                "Must provide either full_message or both message_types and message_data"
            )

        # Include the EIP712Domain type in the types if not already present
        typed_data["domain"] = typed_data.get("domain", {})
        eip712_domain_type = self._get_types_for_eip712_domain(typed_data["domain"])
        typed_data["types"] = {
            "EIP712Domain": eip712_domain_type,
            **typed_data["types"],
        }

        # Process the message to handle bytes32 types properly
        typed_data["message"] = self._process_message_bytes(
            message=typed_data["message"],
            types=typed_data["types"],
            type_key=typed_data["primaryType"],
        )

        # https://github.com/ethereum/eth-account/blob/main/eth_account/account.py#L1047
        signable_message = encode_typed_data(full_message=typed_data)
        message_hash = _hash_eip191_message(signable_message)

        return _run_async(self._server_account.unsafe_sign_hash(message_hash))

    def _get_types_for_eip712_domain(
        self, domain: dict[str, Any] | None = None
    ) -> list[dict[str, str]]:
        """Get types for EIP712Domain based on the domain properties that are present.

        This function dynamically generates the EIP712Domain type definition based on
        which domain properties are provided.

        Args:
            domain: The domain data dictionary

        Returns:
            List of field definitions for EIP712Domain type

        """
        types = []

        if domain is None:
            return types

        if isinstance(domain.get("name"), str):
            types.append({"name": "name", "type": "string"})

        if domain.get("version"):
            types.append({"name": "version", "type": "string"})

        if isinstance(domain.get("chainId"), int):
            types.append({"name": "chainId", "type": "uint256"})

        if domain.get("verifyingContract"):
            types.append({"name": "verifyingContract", "type": "address"})

        if domain.get("salt"):
            types.append({"name": "salt", "type": "bytes32"})

        return types

    def _process_message_bytes(
        self,
        message: dict[str, Any],
        types: dict[str, Any],
        type_key: str,
    ) -> dict[str, Any]:
        """Process message data to handle bytes32 types properly.

        Args:
            message: The message data
            types: The type definitions
            type_key: The key of the type to process

        Returns:
            The processed message with bytes32 values properly encoded

        """

        def _find_field_type(field_name: str, fields: list) -> str | None:
            for field in fields:
                if field["name"] == field_name:
                    return field["type"]
            return None

        type_fields = types[type_key]
        processed_message = {}

        for key, value in message.items():
            processed_message[key] = value
            if isinstance(value, dict):
                # Handle nested objects by recursively processing them
                value_type = _find_field_type(key, type_fields)
                if value_type:
                    processed_message[key] = self._process_message_bytes(value, types, value_type)
            elif isinstance(value, bytes) and _find_field_type(key, type_fields) == "bytes32":
                # Handle bytes32 values so our internal sign typed data can serialize them properly
                value_str = value.hex()
                processed_message[key] = (
                    "0x" + value_str if not value_str.startswith("0x") else value_str
                )

        return processed_message

    def __str__(self) -> str:
        """Return a string representation of the EthereumAccount object.

        Returns:
            str: A string representation of the EthereumAccount.

        """
        return f"Ethereum Account Address: {self.address}"

    def __repr__(self) -> str:
        """Return a string representation of the EthereumAccount object.

        Returns:
            str: A string representation of the EthereumAccount.

        """
        return str(self)
