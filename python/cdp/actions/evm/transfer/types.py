from abc import ABC, abstractmethod
from typing import Literal

from eth_typing import HexStr
from pydantic import BaseModel
from web3 import Web3

from cdp.api_clients import ApiClients
from cdp.evm_server_account import EvmServerAccount
from cdp.evm_smart_account import EvmSmartAccount

TokenType = Literal["eth", "usdc"] | HexStr


class WaitOptions(BaseModel):
    """The options for waiting for a transfer."""

    # The timeout for the wait. If using a smart account, defaults to 20 seconds, otherwise defaults to 120 seconds.
    timeout_seconds: float

    # The interval for the wait. If using a smart account, defaults to 0.2 seconds, otherwise defaults to 0.1 seconds.
    interval_seconds: float


class TransferOptions(BaseModel):
    """The options for a token transfer."""

    # The account or address to transfer the token to
    to: str | EvmServerAccount | EvmSmartAccount

    # The amount of the token to transfer
    # If a string is provided, it will be parsed into an int based on the token's decimals
    amount: int | str

    # The token to transfer. Can be a contract address or a predefined token name
    token: TokenType

    # The network to transfer the token on
    network: str

    # The paymaster URL to use for the transfer
    paymaster_url: str | None = None

    # The wait options for the transfer
    wait_options: WaitOptions | None = None


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
        to: str,
        value: int,
        token: TokenType,
        network: str,
        paymaster_url: str | None,
    ) -> HexStr:
        """Execute the transfer.

        Args:
            api_clients: The API clients to use for the transfer
            from_account: The account to transfer the token from
            to: The account to transfer the token to
            value: The value of the transfer
            token: The token to transfer
            network: The network to transfer the token on
            paymaster_url: The paymaster URL to use for the transfer. Only used for smart accounts.

        Returns:
            The transaction hash of the transfer

        """
        pass

    @abstractmethod
    async def wait_for_result(
        self,
        api_clients: ApiClients,
        w3: Web3,
        from_account,
        hash: HexStr,
        wait_options: WaitOptions,
    ) -> TransferResult:
        """Wait for the result of the transfer.

        Args:
            api_clients: The API clients to use for the transfer
            w3: The Web3 interface to use for the transfer
            from_account: The account to transfer the token from
            hash: The transaction hash of the transfer
            wait_options: The options for waiting for the result of the transfer
        Returns:
            The result of the transfer

        """
        pass
