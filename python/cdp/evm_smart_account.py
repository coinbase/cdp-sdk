from typing import Literal

from eth_account.signers.base import BaseAccount
from pydantic import BaseModel, ConfigDict, Field

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
from cdp.actions.evm.send_user_operation import send_user_operation
from cdp.actions.evm.swap.types import (
    QuoteSwapResult,
    SmartAccountSwapOptions,
    SmartAccountSwapResult,
)
from cdp.actions.evm.wait_for_user_operation import wait_for_user_operation
from cdp.api_clients import ApiClients
from cdp.evm_call_types import ContractCall
from cdp.evm_token_balances import ListTokenBalancesResult
from cdp.openapi_client.models.evm_smart_account import EvmSmartAccount as EvmSmartAccountModel
from cdp.openapi_client.models.evm_user_operation import EvmUserOperation as EvmUserOperationModel
from cdp.openapi_client.models.transfer import Transfer


class EvmSmartAccount(BaseModel):
    """A class representing an EVM smart account."""

    model_config = ConfigDict(arbitrary_types_allowed=True)

    def __init__(
        self,
        address: str,
        owner: BaseAccount,
        name: str | None = None,
        policies: list[str] | None = None,
        api_clients: ApiClients | None = None,
    ) -> None:
        """Initialize the EvmSmartAccount class.

        Args:
            address (str): The address of the smart account.
            owner (BaseAccount): The owner of the smart account.
            name (str | None): The name of the smart account.
            policies (list[str] | None): A list of policy ID's that apply to the account.
            api_clients (ApiClients | None): The API client.

        """
        super().__init__()

        self.__address = address
        self.__owners = [owner]
        self.__name = name
        self.__policies = policies
        self.__api_clients = api_clients

    @property
    def address(self) -> str:
        """Get the Smart Account Address.

        Returns:
            str: The Smart Account Address.

        """
        return self.__address

    @property
    def owners(self) -> list[BaseAccount]:
        """Get the account owners.

        Returns:
            List[BaseAccount]: List of owner accounts

        """
        return self.__owners

    @property
    def name(self) -> str | None:
        """Get the name of the smart account.

        Returns:
            str | None: The name of the smart account.

        """
        return self.__name

    @property
    def policies(self) -> list[str] | None:
        """Gets the list of policies the apply to this account.

        Returns:
            list[str] | None: The list of Policy IDs.

        """
        return self.__policies

    async def transfer(
        self,
        to: str | BaseAccount,
        amount: int,
        token: str,
        network: str,
        paymaster_url: str | None = None,
    ):
        """Transfer an amount of a token from an account to another account.

        Args:
            to: The account or 0x-prefixed address to transfer the token to.
            amount: The amount of the token to transfer, represented as an atomic unit (e.g. 10000 for 0.01 USDC).
            The cdp module exports a `parse_units` util to convert to atomic units.
            Otherwise, you can pass atomic units directly. See examples below.
            token: The token to transfer.
            network: The network to transfer the token on.
            paymaster_url: The paymaster URL to use for the transfer.

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
            >>> sender = await cdp.evm.create_smart_account(
            ...     owner=await cdp.evm.create_account(name="Owner"),
            ... )
            >>> receiver = await cdp.evm.create_account(name="Receiver")
            >>>
            >>> transfer = await sender.transfer({
            ...     "to": receiver,
            ...     "amount": 10000,  # equivalent to 0.01 USDC
            ...     "token": "usdc",
            ...     "network": "base-sepolia",
            ... })

        """
        from cdp.actions.evm.transfer import (
            smart_account_transfer_strategy,
            transfer,
        )

        return await transfer(
            api_clients=self.__api_clients,
            from_account=self,
            to=to,
            amount=amount,
            token=token,
            network=network,
            transfer_strategy=smart_account_transfer_strategy,
            paymaster_url=paymaster_url,
        )

    async def list_token_balances(
        self,
        network: str,
        page_size: int | None = None,
        page_token: str | None = None,
    ) -> ListTokenBalancesResult:
        """List the token balances for the smart account on the given network.

        Args:
            network (str): The network to list the token balances for.
            page_size (int, optional): The number of token balances to return per page. Defaults to None.
            page_token (str, optional): The token for the next page of token balances, if any. Defaults to None.

        Returns:
            [ListTokenBalancesResult]: The token balances for the smart account on the network.

        """
        return await list_token_balances(
            self.__api_clients.evm_token_balances,
            self.address,
            network,
            page_size,
            page_token,
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

    async def send_user_operation(
        self,
        calls: list[ContractCall],
        network: str,
        paymaster_url: str | None = None,
    ) -> EvmUserOperationModel:
        """Send a user operation for the smart account.

        Args:
            calls (List[ContractCall]): The calls to send.
            network (str): The network.
            paymaster_url (str): The paymaster URL.

        Returns:
            EvmUserOperationModel: The user operation model.

        """
        return await send_user_operation(
            self.__api_clients,
            self.address,
            self.owners[0],
            calls,
            network,
            paymaster_url,
        )

    async def wait_for_user_operation(
        self,
        user_op_hash: str,
        timeout_seconds: float = 20,
        interval_seconds: float = 0.2,
    ) -> EvmUserOperationModel:
        """Wait for a user operation to be processed.

        Args:
            user_op_hash (str): The hash of the user operation to wait for.
            timeout_seconds (float, optional): Maximum time to wait in seconds. Defaults to 20.
            interval_seconds (float, optional): Time between checks in seconds. Defaults to 0.2.

        Returns:
            EvmUserOperationModel: The user operation model.

        """
        return await wait_for_user_operation(
            self.__api_clients,
            self.address,
            user_op_hash,
            timeout_seconds,
            interval_seconds,
        )

    async def get_user_operation(self, user_op_hash: str) -> EvmUserOperationModel:
        """Get a user operation for the smart account by hash.

        Args:
            user_op_hash (str): The hash of the user operation to get.

        Returns:
            EvmUserOperationModel: The user operation model.

        """
        return await self.__api_clients.evm_smart_accounts.get_user_operation(
            self.address, user_op_hash
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

    async def swap(
        self,
        options: SmartAccountSwapOptions,
    ) -> SmartAccountSwapResult:
        """Execute a token swap via user operation.

        Args:
            options: SmartAccountSwapOptions with either swap_quote OR inline parameters

        Returns:
            SmartAccountSwapResult: The user operation result containing:
                - user_op_hash: The user operation hash
                - smart_account_address: The smart account address
                - status: The operation status

        Raises:
            ValueError: If liquidity is not available for the swap
            Exception: If the swap operation fails

        Examples:
            **Using pre-created swap quote (recommended for inspecting details first)**:
            ```python
            from cdp.actions.evm.swap.types import SmartAccountSwapOptions

            # First create a quote
            quote = await smart_account.quote_swap(
                from_token="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",  # USDC
                to_token="0x4200000000000000000000000000000000000006",  # WETH
                from_amount="100000000",  # 100 USDC
                network="base",
                idempotency_key="..."
            )

            # Then execute the swap
            result = await smart_account.swap(
                SmartAccountSwapOptions(
                    swap_quote=quote,
                    idempotency_key="..."
                )
            )
            ```

            **Using inline parameters (all-in-one pattern)**:
            ```python
            from cdp.actions.evm.swap.types import SmartAccountSwapOptions

            result = await smart_account.swap(
                SmartAccountSwapOptions(
                    network="base",
                    from_token="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",  # USDC
                    to_token="0x4200000000000000000000000000000000000006",  # WETH
                    from_amount="100000000",  # 100 USDC
                    slippage_bps=100,  # 1% slippage
                    idempotency_key="..."
                )
            )
            ```

        """
        from cdp.actions.evm.swap.send_swap_operation import (
            SendSwapOperationOptions,
            send_swap_operation,
        )

        # Convert SmartAccountSwapOptions to SendSwapOperationOptions
        if options.swap_quote is not None:
            # Quote-based pattern
            # Use paymaster_url from options if provided, otherwise check if quote has one
            paymaster_url = options.paymaster_url
            if paymaster_url is None and hasattr(options.swap_quote, "_paymaster_url"):
                paymaster_url = options.swap_quote._paymaster_url

            send_options = SendSwapOperationOptions(
                smart_account=self,
                network=options.swap_quote.network,  # Get network from quote
                paymaster_url=paymaster_url,
                idempotency_key=options.idempotency_key,
                swap_quote=options.swap_quote,
            )
        else:
            # Inline pattern
            send_options = SendSwapOperationOptions(
                smart_account=self,
                network=options.network,
                paymaster_url=options.paymaster_url,
                idempotency_key=options.idempotency_key,
                from_token=options.from_token,
                to_token=options.to_token,
                from_amount=options.from_amount,
                taker=self.address,  # Smart account is always the taker
                slippage_bps=options.slippage_bps,
            )

        return await send_swap_operation(
            api_clients=self.__api_clients,
            options=send_options,
        )

    async def quote_swap(
        self,
        from_token: str,
        to_token: str,
        from_amount: str | int,
        network: str,
        slippage_bps: int | None = None,
        paymaster_url: str | None = None,
        idempotency_key: str | None = None,
    ) -> QuoteSwapResult:
        """Get a quote for swapping tokens with a smart account.

        This is a convenience method that calls the underlying create_swap_quote
        with the smart account's address as the taker and the owner's address as the signer.

        Args:
            from_token: The contract address of the token to swap from
            to_token: The contract address of the token to swap to
            from_amount: The amount to swap from (in smallest unit)
            network: The network to execute the swap on
            slippage_bps: Maximum slippage in basis points (100 = 1%). Defaults to 100.
            paymaster_url: Optional paymaster URL for gas sponsorship.
            idempotency_key: Optional idempotency key for safe retryable requests.

        Returns:
            QuoteSwapResult: The swap quote with transaction data

        Raises:
            ValueError: If parameters are invalid or liquidity is unavailable
            Exception: If the API request fails

        Examples:
            ```python
            # Get a quote for swapping USDC to WETH (smart account as taker, owner as signer)
            quote = await smart_account.quote_swap(
                from_token="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",  # USDC
                to_token="0x4200000000000000000000000000000000000006",  # WETH
                from_amount="100000000",  # 100 USDC
                network="base",
                paymaster_url="https://paymaster.example.com",  # Optional
                idempotency_key="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            )
            print(f"Expected output: {quote.to_amount}")

            # Execute the quote if satisfied
            result = await smart_account.swap(network="base", swap_quote=quote)
            ```

        """
        from cdp.actions.evm.swap.create_swap_quote import create_swap_quote

        # Call create_swap_quote with smart account address as taker and owner address as signer
        return await create_swap_quote(
            api_clients=self.__api_clients,
            from_token=from_token,
            to_token=to_token,
            from_amount=from_amount,
            network=network,
            taker=self.address,  # Smart account is the taker (owns the tokens)
            slippage_bps=slippage_bps,
            signer_address=self.owners[0].address,  # Owner signs for the smart account
            smart_account=self,
            paymaster_url=paymaster_url,
            idempotency_key=idempotency_key,
        )

    def __str__(self) -> str:
        """Return a string representation of the EthereumAccount object.

        Returns:
            str: A string representation of the EthereumAccount.

        """
        return f"Smart Account Address: {self.address}"

    def __repr__(self) -> str:
        """Return a string representation of the SmartAccount object.

        Returns:
            str: A string representation of the SmartAccount.

        """
        return str(self)

    @classmethod
    def to_evm_smart_account(
        cls, address: str, owner: BaseAccount, name: str | None = None
    ) -> "EvmSmartAccount":
        """Construct an existing smart account by its address and the owner.

        Args:
            address (str): The address of the evm smart account to retrieve.
            owner (BaseAccount): The owner of the evm smart account.
            name (str | None): The name of the evm smart account.

        Returns:
            EvmSmartAccount: The retrieved EvmSmartAccount object.

        Raises:
            Exception: If there's an error retrieving the EvmSmartAccount.

        """
        return cls(address, owner, name)


class ListEvmSmartAccountsResponse(BaseModel):
    """Response model for listing EVM smart accounts."""

    accounts: list[EvmSmartAccountModel] = Field(description="List of EVM smart accounts models.")
    next_page_token: str | None = Field(
        None,
        description="Token for the next page of results. If None, there are no more results.",
    )

    model_config = ConfigDict(arbitrary_types_allowed=True)
