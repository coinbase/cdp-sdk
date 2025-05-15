from typing import Any

from eth_account.datastructures import (
    SignedMessage,
    SignedTransaction,
)
from eth_account.messages import (
    SignableMessage,
    _hash_eip191_message,
)
from eth_account.signers.base import BaseAccount
from eth_account.typed_transactions import DynamicFeeTransaction, TypedTransaction
from eth_account.types import (
    TransactionDictType,
)
from eth_typing import (
    Hash32,
)
from hexbytes import HexBytes
from pydantic import BaseModel, ConfigDict, Field
from web3 import Web3

from cdp.actions.evm.list_token_balances import list_token_balances
from cdp.actions.evm.request_faucet import request_faucet
from cdp.actions.evm.send_transaction import send_transaction
from cdp.api_clients import ApiClients
from cdp.evm_token_balances import ListTokenBalancesResult
from cdp.evm_transaction_types import TransactionRequestEIP1559
from cdp.openapi_client.api.evm_accounts_api import EVMAccountsApi
from cdp.openapi_client.models.eip712_domain import EIP712Domain
from cdp.openapi_client.models.eip712_message import EIP712Message
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
        self.__policies = evm_server_account_model.policies
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

    @property
    def policies(self) -> list[str]:
        """Gets the list of policies the apply to this account.

        Returns:
            str: The list of Policy IDs.

        """
        return self.__policies

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

    async def transfer(self, to: str | BaseAccount, amount: int, token: str, network: str):
        """Transfer an amount of a token from an account to another account.

        Args:
            to: The account or 0x-prefixed address to transfer the token to.
            amount: The amount of the token to transfer, represented as an atomic unit (e.g. 10000 for 0.01 USDC).
            The cdp module exports a `parse_units` util to convert to atomic units.
            Otherwise, you can pass atomic units directly. See examples below.
            token: The token to transfer.
            network: The network to transfer the token on.

        Returns:
            The result of the transfer.

        Examples:
            >>> transfer = await sender.transfer(
            ...     to="0x9F663335Cd6Ad02a37B633602E98866CF944124d",
            ...     amount=10000,  # equivalent to 0.01 USDC
            ...     token="usdc",
            ...     network="base-sepolia",
            ... )

            **Using parse_units to specify USDC amount**
            >>> from cdp import parse_units
            >>> transfer = await sender.transfer(
            ...     to="0x9F663335Cd6Ad02a37B633602E98866CF944124d",
            ...     amount=parse_units("0.01", 6),  # USDC uses 6 decimal places
            ...     token="usdc",
            ...     network="base-sepolia",
            ... )

            **Transfer to another account**
            >>> sender = await cdp.evm.create_account(name="Sender")
            >>> receiver = await cdp.evm.create_account(name="Receiver")
            >>>
            >>> transfer = await sender.transfer({
            ...     "to": receiver,
            ...     "amount": 10000,  # equivalent to 0.01 USDC
            ...     "token": "usdc",
            ...     "network": "base-sepolia",
            ... })

        """
        from cdp.actions.evm.transfer import account_transfer_strategy, transfer

        return await transfer(
            api_clients=self.__api_clients,
            from_account=self,
            to=to,
            amount=amount,
            token=token,
            network=network,
            transfer_strategy=account_transfer_strategy,
        )

    async def request_faucet(
        self,
        network: str,
        token: str,
    ) -> str:
        """Request a token from the faucet.

        Args:
            network (str): The network to request the faucet for.
            token (str): The token to request the faucet for.

        Returns:
            str: The transaction hash of the faucet request.

        """
        return await request_faucet(
            self.__api_clients.faucets,
            self.address,
            network,
            token,
        )

    async def sign_typed_data(
        self,
        domain: EIP712Domain,
        types: dict[str, Any],
        primary_type: str,
        message: dict[str, Any],
        idempotency_key: str | None = None,
    ) -> str:
        """Sign an EVM typed data.

        Args:
            domain (EIP712Domain): The domain of the message.
            types (Dict[str, Any]): The types of the message.
            primary_type (str): The primary type of the message.
            message (Dict[str, Any]): The message to sign.
            idempotency_key (str, optional): The idempotency key. Defaults to None.

        Returns:
            str: The signature.

        """
        eip712_message = EIP712Message(
            domain=domain,
            types=types,
            primary_type=primary_type,
            message=message,
        )
        response = await self.__evm_accounts_api.sign_evm_typed_data(
            address=self.address,
            eip712_message=eip712_message,
            x_idempotency_key=idempotency_key,
        )
        return response.signature

    async def list_token_balances(
        self,
        network: str,
        page_size: int | None = None,
        page_token: str | None = None,
    ) -> ListTokenBalancesResult:
        """List the token balances for the account on the given network.

        Args:
            network (str): The network to list the token balances for.
            page_size (int, optional): The number of token balances to return per page. Defaults to None.
            page_token (str, optional): The token for the next page of token balances, if any. Defaults to None.

        Returns:
            [ListTokenBalancesResult]: The token balances for the account on the network.

        """
        return await list_token_balances(
            self.__api_clients.evm_token_balances,
            self.address,
            network,
            page_size,
            page_token,
        )

    async def send_transaction(
        self,
        transaction: str | TransactionRequestEIP1559 | DynamicFeeTransaction,
        network: str,
        idempotency_key: str | None = None,
    ) -> str:
        """Send an EVM transaction.

        Args:
            transaction (str | TransactionDictType | DynamicFeeTransaction): The transaction to send.

                This can be either an RLP-encoded transaction to sign and send, as a 0x-prefixed hex string, or an EIP-1559 transaction request object.

                Use TransactionRequestEIP1559 if you would like Coinbase to manage the nonce and gas parameters.

                You can also use DynamicFeeTransaction from eth-account, but you will have to set the nonce and gas parameters manually.

                These are the fields that can be contained in the transaction object:

                    - `to`: (Required) The address of the contract or account to send the transaction to.
                    - `value`: (Optional) The amount of ETH, in wei, to send with the transaction.
                    - `data`: (Optional) The data to send with the transaction; only used for contract calls.
                    - `gas`: (Optional) The amount of gas to use for the transaction.
                    - `nonce`: (Optional) The nonce to use for the transaction. If not provided, the API will assign a nonce to the transaction based on the current state of the account.
                    - `maxFeePerGas`: (Optional) The maximum fee per gas to use for the transaction. If not provided, the API will estimate a value based on current network conditions.
                    - `maxPriorityFeePerGas`: (Optional) The maximum priority fee per gas to use for the transaction. If not provided, the API will estimate a value based on current network conditions.
                    - `accessList`: (Optional) The access list to use for the transaction.
                    - `chainId`: (Ignored) The value of the `chainId` field in the transaction is ignored.
                    - `from`: (Ignored) Ignored in favor of the account address that is sending the transaction.
                    - `type`: (Ignored) The transaction type must always be 0x2 (EIP-1559).

            network (str): The network.
            idempotency_key (str, optional): The idempotency key. Defaults to None.

        Returns:
            str: The transaction hash.

        """
        return await send_transaction(
            evm_accounts=self.__evm_accounts_api,
            address=self.address,
            transaction=transaction,
            network=network,
            idempotency_key=idempotency_key,
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
