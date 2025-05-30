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
                    from_token="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",  # USDC
                    to_token="0x4200000000000000000000000000000000000006",  # WETH
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
            from_token=create_options.from_token,
            to_token=create_options.to_token,
            amount=create_options.amount,
            network=create_options.network,
        )

        # Create the swap
        swap_tx = await evm_client.create_swap(
            from_token=create_options.from_token,
            to_token=create_options.to_token,
            amount=create_options.amount,
            network=create_options.network,
            wallet_address=from_account.address,
            slippage_percentage=create_options.slippage_percentage,
        )

        # Handle Permit2 signature if required
        permit2_signature = None
        if swap_tx.requires_signature and swap_tx.permit2_data:
            # Sign the Permit2 typed data
            typed_data = swap_tx.permit2_data.eip712
            permit2_signature = await from_account.sign_typed_data(
                domain=typed_data["domain"],
                types=typed_data["types"],
                primary_type=typed_data["primaryType"],
                message=typed_data["message"],
            )

        # Convert SwapTransaction to CreateSwapResult
        swap_data = CreateSwapResult(
            quote_id=quote.quote_id,
            from_token=create_options.from_token,
            to_token=create_options.to_token,
            from_amount=create_options.amount,
            to_amount=quote.to_amount,
            to=swap_tx.to,
            data=swap_tx.data,
            value=str(swap_tx.value),
            gas_limit=None,  # Will be estimated during execution
            gas_price=None,
            max_fee_per_gas=None,
            max_priority_fee_per_gas=None,
        )

        network = create_options.network
    else:
        # Pattern 2: Use pre-created swap data
        swap_data = swap_options.create_swap_result
        network = None  # Will be determined by strategy
        permit2_signature = None  # Assume pre-created data already includes signature

    # Execute the swap using the appropriate strategy
    result = await swap_strategy.execute_swap(
        api_clients=api_clients,
        from_account=from_account,
        swap_data=swap_data,
        network=network,
        permit2_signature=permit2_signature,
    )

    return result
