from abc import ABC, abstractmethod
from typing import Literal

from eth_typing import HexStr
from pydantic import BaseModel
from web3 import Web3

from cdp.api_clients import ApiClients
from cdp.evm_server_account import EvmServerAccount
from cdp.evm_smart_account import EvmSmartAccount


class TransferOptions(BaseModel):
    """The options for a token transfer."""

    # The account or address to transfer the token to
    to: str | EvmServerAccount | EvmSmartAccount

    # The amount of the token to transfer
    # If a string is provided, it will be parsed into an int based on the token's decimals
    amount: int | str

    # The token to transfer. Can be a contract address or a predefined token name
    token: Literal["eth", "usdc"] | HexStr

    # The network to transfer the token on
    network: str


class TransferResult(BaseModel):
    """The result of a transfer."""

    # The status of the transaction
    status: str

    # The transaction hash of the transfer
    transaction_hash: HexStr


class TransferExecutionStrategy(ABC):
    """A strategy for executing a transfer."""

    @abstractmethod
    async def execute_transfer(
        self,
        api_clients: ApiClients,
        from_account,
        transfer_args: TransferOptions,
        to: str,
        value: int,
    ) -> HexStr:
        """Execute the transfer.

        Args:
            api_clients: The API clients to use for the transfer
            from_account: The account to transfer the token from
            transfer_args: The arguments for the transfer
            to: The account to transfer the token to
            value: The value of the transfer

        Returns:
            The transaction hash of the transfer

        """
        pass

    @abstractmethod
    async def wait_for_result(
        self, api_clients: ApiClients, w3: Web3, from_account, hash: HexStr
    ) -> TransferResult:
        """Wait for the result of the transfer.

        Args:
            api_clients: The API clients to use for the transfer
            w3: The Web3 interface to use for the transfer
            from_account: The account to transfer the token from
            hash: The transaction hash of the transfer

        Returns:
            The result of the transfer

        """
        pass
