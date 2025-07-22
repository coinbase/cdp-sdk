from abc import ABC, abstractmethod
from typing import Literal

from eth_typing import HexStr

from cdp.api_clients import ApiClients
from cdp.openapi_client.models.evm_user_operation import EvmUserOperation as EvmUserOperationModel

TokenType = Literal["eth", "usdc"] | HexStr


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
    ) -> HexStr | EvmUserOperationModel:
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
