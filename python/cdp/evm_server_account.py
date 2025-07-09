from typing import Any, Literal

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

from cdp.actions.evm.fund import (
    FundOptions,
    QuoteFundOptions,
    fund,
    quote_fund,
    wait_for_fund_operation_receipt,
)
from cdp.actions.evm.fund.quote import Quote
from cdp.actions.evm.fund.types import FundOperationResult
from cdp.actions.evm.list_token_balances import list_token_balances
from cdp.actions.evm.request_faucet import request_faucet
from cdp.actions.evm.send_transaction import send_transaction
from cdp.actions.evm.swap import AccountSwapOptions
from cdp.actions.evm.swap.types import AccountSwapResult, QuoteSwapResult
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
from cdp.openapi_client.models.transfer import Transfer


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
    def policies(self) -> list[str] | None:
        """Gets the list of policies the apply to this account.

        Returns:
            list[str] | None: The list of Policy IDs.

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
        signature_response = await self.__evm_accounts_api.sign_evm_message(
            address=self.address,
            sign_evm_message_request=SignEvmMessageRequest(message=message_hex),
            x_idempotency_key=idempotency_key,
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

    async def swap(self, swap_options: AccountSwapOptions) -> AccountSwapResult:
        """Execute a token swap.

        Args:
            swap_options: The swap options

        Returns:
            AccountSwapResult: The result containing the transaction hash

        """
        from cdp.actions.evm.swap.send_swap_transaction import send_swap_transaction
        from cdp.actions.evm.swap.types import (
            InlineSendSwapTransactionOptions,
            QuoteBasedSendSwapTransactionOptions,
        )

        # Convert AccountSwapOptions to the appropriate discriminated union type
        if swap_options.swap_quote is not None:
            # Use quote-based options
            options = QuoteBasedSendSwapTransactionOptions(
                address=self.address,
                swap_quote=swap_options.swap_quote,
                idempotency_key=swap_options.idempotency_key,
            )
        else:
            # Use inline options
            options = InlineSendSwapTransactionOptions(
                address=self.address,
                network=swap_options.network,
                from_token=swap_options.from_token,
                to_token=swap_options.to_token,
                from_amount=swap_options.from_amount,
                taker=self.address,  # For regular accounts, taker is same as address
                slippage_bps=swap_options.slippage_bps,
                idempotency_key=swap_options.idempotency_key,
            )

        return await send_swap_transaction(
            api_clients=self.__api_clients,
            options=options,
        )

    async def quote_swap(
        self,
        from_token: str,
        to_token: str,
        from_amount: str | int,
        network: str,
        slippage_bps: int | None = None,
        signer_address: str | None = None,
        idempotency_key: str | None = None,
    ) -> "QuoteSwapResult":
        """Get a quote for swapping tokens.

        This is a convenience method that calls the underlying create_swap_quote
        with the account's address as the taker.

        Args:
            from_token: The contract address of the token to swap from
            to_token: The contract address of the token to swap to
            from_amount: The amount to swap from (in smallest unit)
            network: The network to execute the swap on
            slippage_bps: Maximum slippage in basis points (100 = 1%). Defaults to 100.
            signer_address: The address that will sign the transaction (for smart accounts). Currently unused.
            idempotency_key: Optional idempotency key for safe retryable requests.

        Returns:
            QuoteSwapResult: The swap quote with transaction data

        Examples:
            >>> # Get a quote for swapping USDC to WETH (account as taker)
            >>> quote = await account.quote_swap(
            ...     from_token="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",  # USDC
            ...     to_token="0x4200000000000000000000000000000000000006",  # WETH
            ...     from_amount="100000000",  # 100 USDC
            ...     network="base",
            ...     idempotency_key="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            ... )
            >>> print(f"Expected output: {quote.to_amount}")
            >>>
            >>> # Execute the quote if satisfied
            >>> result = await account.swap(AccountSwapOptions(swap_quote=quote))

        """
        from cdp.actions.evm.swap.create_swap_quote import create_swap_quote

        # Call create_swap_quote directly with the account address as taker
        return await create_swap_quote(
            api_clients=self.__api_clients,
            from_token=from_token,
            to_token=to_token,
            from_amount=from_amount,
            network=network,
            taker=self.address,
            slippage_bps=slippage_bps,
            signer_address=signer_address,
            idempotency_key=idempotency_key,
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

    async def quote_fund(
        self,
        network: Literal["base", "ethereum"],
        amount: int,
        token: Literal["eth", "usdc"],
    ) -> Quote:
        """Quote a fund operation.

        Args:
            network: The network to fund the account on.
            amount: The amount of the token to fund in atomic units (e.g. 1000000 for 1 USDC).
            token: The token to fund.

        Returns:
            Quote: A quote object containing:
                - quote_id: The ID of the quote
                - network: The network the quote is for
                - fiat_amount: The amount in fiat currency
                - fiat_currency: The fiat currency (e.g. "usd")
                - token_amount: The amount of tokens to receive
                - token: The token to receive
                - fees: List of fees associated with the quote

        """
        fund_options = QuoteFundOptions(
            network=network,
            amount=amount,
            token=token,
        )

        return await quote_fund(
            api_clients=self.__api_clients,
            address=self.address,
            quote_fund_options=fund_options,
        )

    async def fund(
        self,
        network: Literal["base", "ethereum"],
        amount: int,
        token: Literal["eth", "usdc"],
    ) -> FundOperationResult:
        """Fund an EVM account.

        Args:
            network: The network to fund the account on.
            amount: The amount of the token to fund in atomic units (e.g. 1000000 for 1 USDC).
            token: The token to fund.

        Returns:
            FundOperationResult: The result of the fund operation containing:
                - transfer: A Transfer object with details about the transfer including:
                    - id: The transfer ID
                    - status: The status of the transfer (e.g. "pending", "completed", "failed")
                    - source_amount: The amount in source currency
                    - source_currency: The source currency
                    - target_amount: The amount in target currency
                    - target_currency: The target currency
                    - fees: List of fees associated with the transfer

        """
        fund_options = FundOptions(
            network=network,
            amount=amount,
            token=token,
        )

        return await fund(
            api_clients=self.__api_clients,
            address=self.address,
            fund_options=fund_options,
        )

    async def wait_for_fund_operation_receipt(
        self,
        transfer_id: str,
        timeout_seconds: float = 900,
        interval_seconds: float = 1,
    ) -> Transfer:
        """Wait for a fund operation to complete.

        Args:
            transfer_id: The ID of the transfer to wait for.
            timeout_seconds: The maximum time to wait for completion in seconds. Defaults to 900 (15 minutes).
            interval_seconds: The time between status checks in seconds. Defaults to 1.

        Returns:
            Transfer: The completed transfer object containing:
                - id: The transfer ID
                - status: The final status of the transfer ("completed" or "failed")
                - source_amount: The amount in source currency
                - source_currency: The source currency
                - target_amount: The amount in target currency
                - target_currency: The target currency
                - fees: List of fees associated with the transfer

        Raises:
            TimeoutError: If the transfer does not complete within the timeout period.

        """
        return await wait_for_fund_operation_receipt(
            api_clients=self.__api_clients,
            transfer_id=transfer_id,
            timeout_seconds=timeout_seconds,
            interval_seconds=interval_seconds,
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
