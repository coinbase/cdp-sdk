from web3 import Web3

from cdp.actions.evm.transfer.types import (
    Transfer,
    TransferExecutionStrategy,
    WaitForTransferReceiptOptions,
)
from cdp.actions.evm.transfer.utils import get_chain_config
from cdp.api_clients import ApiClients
from cdp.evm_server_account import EvmServerAccount
from cdp.evm_smart_account import EvmSmartAccount


async def wait_for_transfer_receipt(
    api_clients: ApiClients,
    from_account: EvmServerAccount | EvmSmartAccount,
    wait_args: WaitForTransferReceiptOptions,
    transfer_strategy: TransferExecutionStrategy,
) -> Transfer:
    """Wait for the result of a transfer.

    Args:
        api_clients: The API clients to use to send the transaction
        from_account: The account to send the transaction from
        wait_args: The options for waiting for the receipt
        transfer_strategy: The strategy to use to execute the transfer

    Returns:
        The result of the transfer

    """
    # Create a Web3 client for the specified network
    chain_config = get_chain_config(wait_args.network)
    w3 = Web3(Web3.HTTPProvider(chain_config["rpc_url"]))

    # Create wait options from the wait args
    wait_options = {
        "timeout_seconds": wait_args.timeout_seconds,
        "interval_seconds": wait_args.interval_seconds,
    }

    # Wait for the result
    result = await transfer_strategy.wait_for_result(
        api_clients=api_clients,
        w3=w3,
        from_account=from_account,
        hash=wait_args.hash,
        wait_options=wait_options,
    )

    return result
