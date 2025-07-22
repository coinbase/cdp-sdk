from typing import TypeVar

from eth_typing import HexStr

from cdp.actions.evm.transfer.types import (
    TransferExecutionStrategy,
)
from cdp.api_clients import ApiClients
from cdp.evm_server_account import EvmServerAccount
from cdp.evm_smart_account import EvmSmartAccount
from cdp.openapi_client.models.evm_user_operation import EvmUserOperation as EvmUserOperationModel

# Type for account
T = TypeVar("T", bound=EvmServerAccount | EvmSmartAccount)


async def transfer(
    api_clients: ApiClients,
    from_account: T,
    to: str | EvmServerAccount | EvmSmartAccount,
    amount: int,
    token: str,
    network: str,
    transfer_strategy: TransferExecutionStrategy,
    paymaster_url: str | None = None,
) -> HexStr | EvmUserOperationModel:
    """Transfer an amount of a token from an account to another account.

    Args:
        api_clients: The API clients to use to send the transaction
        from_account: The account to send the transaction from
        to: The account to send the transaction to
        amount: The amount of the token to transfer
        token: The token to transfer
        network: The network to transfer the token on
        transfer_strategy: The strategy to use to execute the transfer
        paymaster_url: The paymaster URL to use for the transfer. Only used for smart accounts.

    Returns:
        The result of the transfer

    """
    # Determine the recipient address
    to_address = to.address if hasattr(to, "address") else to

    kwargs = {
        "api_clients": api_clients,
        "from_account": from_account,
        "to": to_address,
        "value": amount,
        "token": token,
        "network": network,
    }

    if isinstance(from_account, EvmSmartAccount):
        kwargs["paymaster_url"] = paymaster_url

    return await transfer_strategy.execute_transfer(**kwargs)
