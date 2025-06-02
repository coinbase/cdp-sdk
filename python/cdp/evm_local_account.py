import asyncio
from typing import Any

import nest_asyncio
from eth_account.datastructures import SignedMessage, SignedTransaction
from eth_account.messages import SignableMessage
from eth_account.signers.base import BaseAccount
from eth_account.types import TransactionDictType
from eth_typing import Hash32

from cdp.evm_server_account import EvmServerAccount
from cdp.openapi_client.models.eip712_domain import EIP712Domain

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
        elif domain_data is not None and message_types is not None and message_data is not None:
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
                "Must provide either full_message or all of domain_data, message_types, and message_data"
            )

        return _run_async(
            self._server_account.sign_typed_data(
                domain=EIP712Domain(
                    name=typed_data["domain"].get("name"),
                    version=typed_data["domain"].get("version"),
                    chainId=typed_data["domain"].get("chainId"),
                    verifyingContract=typed_data["domain"].get("verifyingContract"),
                    salt=typed_data["domain"].get("salt"),
                ),
                types=typed_data["types"],
                primary_type=typed_data["primaryType"],
                message=typed_data["message"],
            )
        )

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
