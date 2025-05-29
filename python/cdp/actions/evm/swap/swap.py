"""Main swap functionality."""

from eth_account.signers.base import BaseAccount

from cdp.actions.evm.swap.types import CreateSwapResult, SwapOptions, SwapResult, SwapStrategy
from cdp.api_clients import ApiClients


async def swap(
    api_clients: ApiClients,
    from_account: BaseAccount,
    swap_options: SwapOptions,
    swap_strategy: SwapStrategy,
) -> SwapResult:
    """Execute a token swap.

    This function supports two patterns:
    1. Provide CreateSwapOptions - the SDK will call createSwap under the hood
    2. Provide CreateSwapResult - use pre-created swap data from a previous createSwap call

    Args:
        api_clients: The API clients instance
        from_account: The account to swap from
        swap_options: The swap options containing either create_swap_options or create_swap_result
        swap_strategy: The strategy to use for executing the swap

    Returns:
        SwapResult: The result of the swap transaction

    Raises:
        ValueError: If the swap options are invalid
        Exception: If the swap fails

    Examples:
        **Using CreateSwapOptions (SDK calls createSwap)**:
        ```python
        result = await swap(
            api_clients=api_clients,
            from_account=account,
            swap_options=SwapOptions(
                create_swap_options=CreateSwapOptions(
                    from_asset="USDC",
                    to_asset="WETH",
                    amount="1000000",  # 1 USDC
                    network="base",
                    slippage_percentage=1.0
                )
            ),
            swap_strategy=AccountSwapStrategy()
        )
        ```

        **Using pre-created swap data**:
        ```python
        # First create the swap
        swap_data = await api_clients.evm.create_swap(...)

        # Then execute it
        result = await swap(
            api_clients=api_clients,
            from_account=account,
            swap_options=SwapOptions(create_swap_result=swap_data),
            swap_strategy=AccountSwapStrategy()
        )
        ```

    """
    # Import EVM client here to avoid circular imports
    from cdp.evm_client import EvmClient

    # Create an EVM client instance
    evm_client = EvmClient(api_clients)

    # Determine which pattern is being used
    if swap_options.create_swap_options:
        # Pattern 1: SDK calls createSwap under the hood
        create_options = swap_options.create_swap_options

        # Get a quote for the swap
        quote = await evm_client.get_quote(
            from_asset=create_options.from_asset,
            to_asset=create_options.to_asset,
            amount=create_options.amount,
            network=create_options.network,
        )

        # Create the swap
        create_result = await evm_client.create_swap(
            from_asset=create_options.from_asset,
            to_asset=create_options.to_asset,
            amount=create_options.amount,
            network=create_options.network,
            quote=quote,
            slippage_percentage=create_options.slippage_percentage,
        )

        # Convert to CreateSwapResult
        swap_data = CreateSwapResult(
            quote_id=quote.quote_id,
            from_token=create_options.from_asset,
            to_token=create_options.to_asset,
            from_amount=create_options.amount,
            to_amount=quote.to_amount,
            to=create_result["to"],
            data=create_result["data"],
            value=create_result.get("value", "0"),
            gas_limit=create_result.get("gas_limit"),
            gas_price=create_result.get("gas_price"),
            max_fee_per_gas=create_result.get("max_fee_per_gas"),
            max_priority_fee_per_gas=create_result.get("max_priority_fee_per_gas"),
        )

        network = create_options.network
    else:
        # Pattern 2: Use pre-created swap data
        swap_data = swap_options.create_swap_result
        # We need to determine the network from the account or pass it through
        # For now, we'll require it to be part of the strategy
        network = None  # Will be determined by strategy

    # Execute the swap using the appropriate strategy
    result = await swap_strategy.execute_swap(
        api_clients=api_clients,
        from_account=from_account,
        swap_data=swap_data,
        network=network,
    )

    return result
