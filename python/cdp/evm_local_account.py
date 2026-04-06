import asyncio
from typing import Any

from eth_account.datastructures import SignedMessage, SignedTransaction
from eth_account.messages import SignableMessage, _hash_eip191_message, encode_typed_data
from eth_account.signers.base import BaseAccount
from eth_account.types import TransactionDictType
from eth_typing import Hash32

from cdp.errors import UserInputValidationError
from cdp.evm_server_account import EvmServerAccount

# Try to apply nest-asyncio to allow nested event loops, but make it optional
# nest_asyncio is incompatible with Python 3.12+ due to loop_factory parameter support
_nest_asyncio_applied = False
try:
    import nest_asyncio
    # Only apply if we're not in Python 3.12+ with uvicorn or similar
    # that requires loop_factory parameter
    import sys
    if sys.version_info < (3, 12):
        nest_asyncio.apply()
        _nest_asyncio_applied = True
    else:
        # Python 3.12+ - skip nest_asyncio to avoid breaking loop_factory support
        # The _run_async function will handle nested loops differently
        pass
except ImportError:
    # nest_asyncio not installed, continue without it
    pass
except ValueError as e:
    # If nest_asyncio can't patch the loop (e.g., uvloop), silently continue
    if "Can't patch loop" in str(e):
        pass
    else:
        raise


def _run_async(coroutine):
    """Run an async coroutine synchronously.

    This function handles running async code from sync contexts.
    For Python 3.12+, it creates a new event loop if needed to avoid
    conflicts with loop_factory parameter requirements.

    Args:
        coroutine: The coroutine to run

    Returns:
        Any: The result of the coroutine

    """
    try:
        loop = asyncio.get_running_loop()
        # If we're already in an async context, we need to handle this carefully
        # Python 3.12+ with nest_asyncio would fail here due to loop_factory
        if _nest_asyncio_applied:
            # nest_asyncio allows nested loop.run_until_complete calls
            return loop.run_until_complete(coroutine)
        else:
            # Without nest_asyncio, we can't nest event loops
            # This will raise RuntimeError if called from within an async context
            return asyncio.run(coroutine)
    except RuntimeError:
        # No running loop or can't nest - create new loop
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
    def privateKey(self) -> Hash32:
        """Get the private key of the EVM server account.

        Returns:
            Hash32: The private key of the EVM server account.

        Raises:
            UserInputValidationError: If the private key cannot be retrieved for server-side accounts.

        """
        raise UserInputValidationError(
            "Cannot retrieve private key for server-side EVM accounts"
        )

    @property
    def publicKey(self) -> Hash32:
        """Get the public key of the EVM server account.

        Returns:
            Hash32: The public key of the EVM server account.

        Raises:
            UserInputValidationError: If the public key cannot be retrieved for server-side accounts.

        """
        raise UserInputValidationError(
            "Cannot retrieve public key for server-side EVM accounts"
        )

    def sign_message(self, signable_message: SignableMessage) -> SignedMessage:
        """Sign a message.

        Args:
            signable_message (SignableMessage): The message to sign.

        Returns:
            SignedMessage: The signed message.

        """
        message_hash = _hash_eip191_message(signable_message)
        return _run_async(self._server_account.sign_hash(message_hash.hex()))

    def signHash(self, message_hash: Hash32) -> SignedMessage:
        """Sign a hash.

        Args:
            message_hash (Hash32): The hash to sign.

        Returns:
            SignedMessage: The signed hash.

        """
        return _run_async(self._server_account.sign_hash(message_hash.hex()))

    def sign_transaction(
        self, transaction_dict: TransactionDictType
    ) -> SignedTransaction:
        """Sign a transaction.

        Args:
            transaction_dict (TransactionDictType): The transaction to sign.

        Returns:
            SignedTransaction: The signed transaction.

        """
        return _run_async(self._server_account.sign_transaction(transaction_dict))

    def sign_typed_data(
        self, domain_data: dict, message_types: dict, message_data: dict
    ) -> SignedMessage:
        """Sign typed data (EIP-712).

        Args:
            domain_data (dict): The domain data.
            message_types (dict): The message types.
            message_data (dict): The message data.

        Returns:
            SignedMessage: The signed typed data.

        """
        encoded_data = encode_typed_data(domain_data, message_types, message_data)
        return self.sign_message(encoded_data)

    def __eq__(self, other: Any) -> bool:
        """Check if two EvmLocalAccount instances are equal.

        Args:
            other (Any): The other instance to compare.

        Returns:
            bool: True if the instances are equal, False otherwise.

        """
        if not isinstance(other, EvmLocalAccount):
            return NotImplemented
        return self._server_account.address == other._server_account.address

    def __hash__(self) -> int:
        """Get the hash of the EvmLocalAccount instance.

        Returns:
            int: The hash of the instance.

        """
        return hash(self._server_account.address)
