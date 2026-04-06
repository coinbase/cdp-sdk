import asyncio
from typing import Any

from eth_account.datastructures import SignedMessage, SignedTransaction
from eth_account.messages import SignableMessage, _hash_eip191_message, encode_typed_data
from eth_account.signers.base import BaseAccount
from eth_account.types import TransactionDictType
from eth_typing import Hash32

from cdp.errors import UserInputValidationError
from cdp.evm_server_account import EvmServerAccount


def _run_async(coroutine):
    """Run an async coroutine synchronously.

    This function handles running async code from synchronous contexts,
    including when an event loop is already running (e.g., in Jupyter notebooks).
    It uses asyncio.run() when possible, and falls back to creating a new loop
    in a separate thread when already inside an async context.

    Args:
        coroutine: The coroutine to run

    Returns:
        Any: The result of the coroutine

    """
    try:
        # Check if we're already in an event loop
        loop = asyncio.get_running_loop()
        if loop.is_running():
            # We're inside a running event loop (e.g., Jupyter, async context)
            # Create a new loop in a separate thread to avoid conflicts
            import concurrent.futures

            with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
                future = executor.submit(asyncio.run, coroutine)
                return future.result()
    except RuntimeError:
        # No event loop is running, we can use asyncio.run directly
        pass

    return asyncio.run(coroutine)


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

    @property
    def key(self) -> str:
        """Get the key of the EVM server account.

        Raises:
            UserInputValidationError: Always raises an error since the private key is not available.

        """
        raise UserInputValidationError(
            "Private key is not available for server-side accounts. "
            "Please use the sign_message or sign_transaction methods instead."
        )

    def unsafe_sign_hash(self, message_hash: Hash32) -> SignedMessage:
        """Sign a message hash.

        Args:
            message_hash (Hash32): The message hash to sign.

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
        message_hash = _hash_eip191_message(signable_message)
        return self.unsafe_sign_hash(message_hash)

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
        domain: dict[str, Any],
        message_types: dict[str, Any],
        message_contents: dict[str, Any],
    ) -> SignedMessage:
        """Sign typed data (EIP-712).

        Args:
            domain (dict[str, Any]): The EIP-712 domain.
            message_types (dict[str, Any]): The message types.
            message_contents (dict[str, Any]): The message contents.

        Returns:
            SignedMessage: The signed message.

        """
        signable_message = encode_typed_data(domain, message_types, message_contents)
        return self.sign_message(signable_message)

    def __str__(self) -> str:
        """Return a string representation of the EvmLocalAccount.

        Returns:
            str: A string representation of the EvmLocalAccount.

        """
        return f"Ethereum Account Address: {self.address}"

    def __repr__(self) -> str:
        """Return a repr representation of the EvmLocalAccount.

        Returns:
            str: A repr representation of the EvmLocalAccount.

        """
        return f"Ethereum Account Address: {self.address}"
