from eth_account.datastructures import (
    SignedMessage,
    SignedTransaction,
)
from eth_account.messages import (
    SignableMessage,
    _hash_eip191_message,
)
from eth_account.signers.base import BaseAccount
from eth_account.typed_transactions import TypedTransaction
from eth_account.types import (
    TransactionDictType,
)
from eth_typing import (
    Hash32,
)
from hexbytes import HexBytes
from pydantic import BaseModel, ConfigDict, Field
from web3 import Web3

from cdp.api_clients import ApiClients
from cdp.openapi_client.api.evm_accounts_api import EVMAccountsApi
from cdp.openapi_client.models.evm_account import EvmAccount as EvmServerAccountModel
from cdp.openapi_client.models.sign_evm_hash_request import SignEvmHashRequest
from cdp.openapi_client.models.sign_evm_message_request import SignEvmMessageRequest
from cdp.openapi_client.models.sign_evm_transaction_request import (
    SignEvmTransactionRequest,
)


class EvmServerAccount(BaseAccount, BaseModel):
    """A class representing an EVM server account."""

    model_config = ConfigDict(arbitrary_types_allowed=True)

    def __init__(
        self,
        evm_server_account_model: EvmServerAccountModel,
        evm_accounts_api: EVMAccountsApi,
        api_clients: ApiClients,
    ) -> None:
        """Initialize the EvmServerAccount class.

        Args:
            evm_server_account_model (EvmServerAccountModel): The EVM server account model.
            evm_accounts_api (EVMAccountsApi): The EVM accounts API.
            api_clients (ApiClients): The API client.

        """
        super().__init__()

        self.__address = evm_server_account_model.address
        self.__name = evm_server_account_model.name
        self.__evm_accounts_api = evm_accounts_api
        self.__api_clients = api_clients

    @property
    def address(self) -> str:
        """Get the EVM Account Address.

        Returns:
            str: The EVM account address.

        """
        return self.__address

    @property
    def name(self) -> str | None:
        """Get the name of the EVM account.

        Returns:
            str | None: The name of the EVM account.

        """
        return self.__name

    async def sign_message(
        self, signable_message: SignableMessage, idempotency_key: str | None = None
    ) -> SignedMessage:
        """Sign the EIP-191 message.

        Args:
            signable_message: The encoded message, ready for signing
            idempotency_key: Optional idempotency key

        Returns:
            The signed message

        Raises:
            AttributeError: If the signature response is missing required fields

        """
        message_body = signable_message.body
        message_hex = (
            message_body.hex() if isinstance(message_body, bytes) else HexBytes(message_body).hex()
        )
        sign_evm_message_request = SignEvmMessageRequest(message=message_hex)
        signature_response = self.__evm_accounts_api.sign_evm_message(
            self.address, sign_evm_message_request, x_idempotency_key=idempotency_key
        )

        message_hash = _hash_eip191_message(signable_message)

        signature_bytes = HexBytes(signature_response.signature)
        r = int.from_bytes(signature_bytes[0:32], byteorder="big")
        s = int.from_bytes(signature_bytes[32:64], byteorder="big")
        v = signature_bytes[64]

        return SignedMessage(
            message_hash=message_hash,
            r=r,
            s=s,
            v=v,
            signature=signature_bytes,
        )

    async def unsafe_sign_hash(
        self, message_hash: Hash32, idempotency_key: str | None = None
    ) -> SignedMessage:
        """Sign the hash of a message.

        WARNING: Never sign a hash that you didn't generate,
        it can be an arbitrary transaction.

        Args:
            message_hash: 32 byte hash of the message to sign
            idempotency_key: Optional idempotency key

        Returns:
            The signed message

        Raises:
            ValueError: If the signature response is missing required fields

        """
        hash_hex = HexBytes(message_hash).hex()
        sign_evm_hash_request = SignEvmHashRequest(hash=hash_hex)
        signature_response = await self.__evm_accounts_api.sign_evm_hash(
            address=self.address,
            sign_evm_hash_request=sign_evm_hash_request,
            x_idempotency_key=idempotency_key,
        )

        signature_bytes = HexBytes(signature_response.signature)
        r = int.from_bytes(signature_bytes[0:32], byteorder="big")
        s = int.from_bytes(signature_bytes[32:64], byteorder="big")
        v = signature_bytes[64]

        return SignedMessage(
            message_hash=message_hash,
            r=r,
            s=s,
            v=v,
            signature=signature_bytes,
        )

    async def sign_transaction(
        self, transaction_dict: TransactionDictType, idempotency_key: str | None = None
    ) -> SignedTransaction:
        """Sign a transaction dict.

        Args:
            transaction_dict: transaction with all fields specified
            idempotency_key: Optional idempotency key
        Returns:
            The signed transaction
        Raises:
            ValueError: If the signature response is missing required fields

        """
        typed_tx = TypedTransaction.from_dict(transaction_dict)
        typed_tx.transaction.dictionary["v"] = 0
        typed_tx.transaction.dictionary["r"] = 0
        typed_tx.transaction.dictionary["s"] = 0
        payload = typed_tx.transaction.payload()
        serialized_tx = bytes([typed_tx.transaction_type]) + payload

        sign_evm_transaction_request = SignEvmTransactionRequest(
            transaction="0x" + serialized_tx.hex()
        )
        signature_response = await self.__evm_accounts_api.sign_evm_transaction(
            address=self.address,
            sign_evm_transaction_request=sign_evm_transaction_request,
            x_idempotency_key=idempotency_key,
        )

        # Get the signed transaction bytes
        signed_tx_bytes = HexBytes(signature_response.signed_transaction)
        transaction_hash = Web3.keccak(signed_tx_bytes)

        # Extract signature components from the response
        signature_bytes = HexBytes(signature_response.signed_transaction)
        r = int.from_bytes(signature_bytes[0:32], byteorder="big")
        s = int.from_bytes(signature_bytes[32:64], byteorder="big")
        v = signature_bytes[64]

        return SignedTransaction(
            raw_transaction=signed_tx_bytes,
            hash=transaction_hash,
            r=r,
            s=s,
            v=v,
        )

    async def transfer(self, transfer_args):
        """Transfer an amount of a token from an account to another account.

        Args:
            transfer_args: The options for the transfer.
                transfer_args.to: The account or 0x-prefixed address to transfer the token to.
                transfer_args.amount: The amount of the token to transfer.
                transfer_args.token: The token to transfer.
                transfer_args.network: The network to transfer the token on.

        Returns:
            The result of the transfer.

        Examples:
            >>> status = await sender.transfer(
            ...     TransferOptions(
            ...         to="0x9F663335Cd6Ad02a37B633602E98866CF944124d",
            ...         amount="0.01",
            ...         token="usdc",
            ...         network="base-sepolia",
            ...     )
            ... )

            **Pass an int value**
            >>> status = await sender.transfer(
            ...     TransferOptions(
            ...         to="0x9F663335Cd6Ad02a37B633602E98866CF944124d",
            ...         amount=10000,  # equivalent to 0.01 usdc
            ...         token="usdc",
            ...         network="base-sepolia",
            ...     )
            ... )

            **Transfer from a smart account**
            >>> sender = await cdp.evm.create_smart_account(
            ...     owner=await cdp.evm.create_account(name="Owner"),
            ... )
            >>>
            >>> status = await sender.transfer(
            ...     TransferOptions(
            ...         to="0x9F663335Cd6Ad02a37B633602E98866CF944124d",
            ...         amount="0.01",
            ...         token="usdc",
            ...         network="base-sepolia",
            ...     )
            ... )

            **Transfer ETH**
            >>> status = await sender.transfer(
            ...     TransferOptions(
            ...         to="0x9F663335Cd6Ad02a37B633602E98866CF944124d",
            ...         amount="0.000001",
            ...         token="eth",
            ...         network="base-sepolia",
            ...     )
            ... )

            **Using a contract address**
            >>> status = await sender.transfer(
            ...     TransferOptions(
            ...         to="0x9F663335Cd6Ad02a37B633602E98866CF944124d",
            ...         amount="0.000001",
            ...         token="0x4200000000000000000000000000000000000006",  # WETH on Base Sepolia
            ...         network="base-sepolia",
            ...     )
            ... )

            **Transfer to another account**
            >>> sender = await cdp.evm.create_account(name="Sender")
            >>> receiver = await cdp.evm.create_account(name="Receiver")
            >>>
            >>> status = await sender.transfer({
            ...     "to": receiver,
            ...     "amount": "0.01",
            ...     "token": "usdc",
            ...     "network": "base-sepolia",
            ... })

        """
        from cdp.actions.evm.transfer import (
            TransferOptions,
            account_transfer_strategy,
            transfer,
        )

        # Convert to TransferOptions if it's not already
        if not isinstance(transfer_args, TransferOptions):
            transfer_args = TransferOptions(**transfer_args)

        return await transfer(
            api_clients=self.__api_clients,
            from_account=self,
            transfer_args=transfer_args,
            transfer_strategy=account_transfer_strategy,
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

    @classmethod
    def to_evm_account(cls, address: str, name: str | None = None) -> "EvmServerAccount":
        """Construct an existing EvmAccount by its address and the name.

        Args:
            address (str): The address of the EvmAccount to retrieve.
            name (str | None): The name of the EvmAccount.

        Returns:
            EvmAccount: The retrieved EvmAccount object.

        Raises:
            Exception: If there's an error retrieving the EvmAccount.

        """
        return cls(address, name)


class ListEvmAccountsResponse(BaseModel):
    """Response model for listing EVM accounts."""

    accounts: list[EvmServerAccount] = Field(description="List of EVM server accounts.")
    next_page_token: str | None = Field(
        None,
        description="Token for the next page of results. If None, there are no more results.",
    )

    model_config = ConfigDict(arbitrary_types_allowed=True)
