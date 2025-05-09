from eth_account.signers.base import BaseAccount
from pydantic import BaseModel, ConfigDict, Field

from cdp.actions.evm.list_token_balances import list_token_balances
from cdp.actions.evm.request_faucet import request_faucet
from cdp.actions.evm.send_user_operation import send_user_operation
from cdp.actions.evm.wait_for_user_operation import wait_for_user_operation
from cdp.api_clients import ApiClients
from cdp.evm_call_types import ContractCall
from cdp.evm_token_balances import ListTokenBalancesResult
from cdp.openapi_client.models.evm_smart_account import EvmSmartAccount as EvmSmartAccountModel
from cdp.openapi_client.models.evm_user_operation import EvmUserOperation as EvmUserOperationModel


class EvmSmartAccount(BaseModel):
    """A class representing an EVM smart account."""

    model_config = ConfigDict(arbitrary_types_allowed=True)

    def __init__(
        self,
        address: str,
        owner: BaseAccount,
        name: str | None = None,
        api_clients: ApiClients | None = None,
    ) -> None:
        """Initialize the EvmSmartAccount class.

        Args:
            address (str): The address of the smart account.
            owner (BaseAccount): The owner of the smart account.
            name (str | None): The name of the smart account.
            api_clients (ApiClients | None): The API client.

        """
        super().__init__()

        self.__address = address
        self.__owners = [owner]
        self.__name = name
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
