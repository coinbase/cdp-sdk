"""Main swap functionality."""


from eth_account.signers.base import BaseAccount

from cdp.actions.evm.swap.types import SwapOptions, SwapResult, SwapStrategy
from cdp.api_clients import ApiClients


async def swap(
    api_clients: ApiClients,
    from_account: BaseAccount,
    swap_args: SwapOptions | dict,
    swap_strategy: SwapStrategy,
) -> SwapResult:
    """Execute a token swap.

    Args:
        api_clients: The API clients instance
        from_account: The account to swap from
        swap_args: The swap options (as SwapOptions or dict)
        swap_strategy: The strategy to use for executing the swap

    Returns:
        SwapResult: The result of the swap transaction

    Raises:
        ValueError: If the swap arguments are invalid
        Exception: If the swap fails

    """
    # Convert to SwapOptions if needed
    if not isinstance(swap_args, SwapOptions):
        swap_args = SwapOptions(**swap_args)

    # Import EVM client here to avoid circular imports
    from cdp.evm_client import EvmClient

    # Create an EVM client instance
    evm_client = EvmClient(api_clients)

    # Get a quote for the swap
    quote = await evm_client.get_quote(
        from_asset=swap_args.from_asset,
        to_asset=swap_args.to_asset,
        amount=swap_args.amount,
        network=swap_args.network,
    )

    # Execute the swap using the appropriate strategy
    result = await swap_strategy.execute_swap(
        api_clients=api_clients,
        from_account=from_account,
        swap_options=swap_args,
        quote=quote,
    )

    return result
