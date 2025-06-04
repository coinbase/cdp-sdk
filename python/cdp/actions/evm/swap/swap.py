"""Main swap functionality."""

from eth_account.signers.base import BaseAccount

from cdp.actions.evm.swap.types import SwapOptions, SwapResult, SwapStrategy
from cdp.api_clients import ApiClients


async def swap(
    api_clients: ApiClients,
    from_account: BaseAccount,
    swap_options: SwapOptions,
    swap_strategy: SwapStrategy,
) -> SwapResult:
    """Execute a token swap.

    This function supports two patterns:
    1. Direct swap parameters in SwapOptions
    2. Pre-created swap quote in SwapOptions

    Args:
        api_clients: The API clients instance
        from_account: The account to swap from
        swap_options: The swap options containing either direct parameters or a swap quote
        swap_strategy: The strategy to use for executing the swap

    Returns:
        SwapResult: The result of the swap transaction

    Raises:
        ValueError: If the swap options are invalid
        Exception: If the swap fails

    Examples:
        **Using direct parameters**:
        ```python
        result = await swap(
            api_clients=api_clients,
            from_account=account,
            swap_options=SwapOptions(
                network="base",
                from_token="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",  # USDC
                to_token="0x4200000000000000000000000000000000000006",  # WETH
                from_amount="1000000",  # 1 USDC
                slippage_bps=100
            ),
            swap_strategy=AccountSwapStrategy()
        )
        ```

        **Using pre-created swap quote**:
        ```python
        # First create the swap
        swap_quote = await cdp.evm.create_swap_quote(...)

        # Then execute it
        result = await swap(
            api_clients=api_clients,
            from_account=account,
            swap_options=SwapOptions(swap_quote=swap_quote),
            swap_strategy=AccountSwapStrategy()
        )
        ```

    """
    # Import EVM client here to avoid circular imports
    from cdp.evm_client import EvmClient

    # Create an EVM client instance
    evm_client = EvmClient(api_clients)

    # Determine which pattern is being used and get swap data
    swap_data = None
    network = None
    permit2_signature = None

    if swap_options.swap_quote is not None:
        # Pattern 1: Pre-created swap quote
        swap_quote = swap_options.swap_quote

        # Handle Permit2 signature if required
        if swap_quote.requires_signature and swap_quote.permit2_data:
            # Sign the Permit2 typed data
            typed_data = swap_quote.permit2_data.eip712
            permit2_signature = await from_account.sign_typed_data(
                domain=typed_data["domain"],
                types=typed_data["types"],
                primary_type=typed_data["primaryType"],
                message=typed_data["message"],
            )

        swap_data = swap_quote
        network = swap_quote.network

    else:
        # Pattern 2: Direct parameters
        # Create the swap quote from parameters
        swap_quote = await evm_client.create_swap_quote(
            from_token=swap_options.from_token,
            to_token=swap_options.to_token,
            from_amount=swap_options.from_amount,
            network=swap_options.network,
            taker=from_account.address,  # Always use account address as taker
            slippage_bps=swap_options.slippage_bps,
        )

        # Handle Permit2 signature if required
        if swap_quote.requires_signature and swap_quote.permit2_data:
            # Sign the Permit2 typed data
            typed_data = swap_quote.permit2_data.eip712
            permit2_signature = await from_account.sign_typed_data(
                domain=typed_data["domain"],
                types=typed_data["types"],
                primary_type=typed_data["primaryType"],
                message=typed_data["message"],
            )

        swap_data = swap_quote
        network = swap_options.network

    # Execute the swap using the appropriate strategy
    result = await swap_strategy.execute_swap(
        api_clients=api_clients,
        from_account=from_account,
        swap_data=swap_data,
        network=network,
        permit2_signature=permit2_signature,
    )

    return result
