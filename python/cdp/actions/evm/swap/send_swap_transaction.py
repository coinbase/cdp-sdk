"""Send swap transaction function for EVM accounts."""

from typing import Any

from cdp.actions.evm.swap.account_swap_strategy import AccountSwapStrategy
from cdp.actions.evm.swap.swap import swap
from cdp.actions.evm.swap.types import SwapOptions, SwapResult
from cdp.api_clients import ApiClients


async def send_swap_transaction(
    api_clients: ApiClients,
    account: Any,
    options: SwapOptions,
) -> SwapResult:
    """Send a swap transaction with the given options.

    This function handles both direct swap parameters and pre-created swap quotes,
    matching the TypeScript SDK pattern.

    Args:
        api_clients: The API clients instance
        account: The account executing the swap
        options: The swap options containing either direct parameters or a swap quote

    Returns:
        SwapResult: The result of the swap transaction

    Raises:
        ValueError: If the options are invalid
        Exception: If the swap fails

    Examples:
        **Direct swap with parameters**:
        ```python
        result = await send_swap_transaction(
            api_clients=api_clients,
            account=account,
            options=SwapOptions(
                network="base",
                from_token="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",  # USDC
                to_token="0x4200000000000000000000000000000000000006",  # WETH
                from_amount="100000000",  # 100 USDC
                taker=account.address,
                slippage_bps=100  # 1%
            )
        )
        ```

        **Swap with pre-created quote**:
        ```python
        result = await send_swap_transaction(
            api_clients=api_clients,
            account=account,
            options=SwapOptions(
                swap_quote=swap_quote
            )
        )
        ```

    """
    # Determine which type of swap we're doing
    if options.swap_quote is not None:
        # Pre-created swap quote path
        swap_data = options.swap_quote

        # Set the account and api_clients on the quote to enable execute()
        swap_data._from_account = account
        swap_data._api_clients = api_clients

        # Use the existing swap function with the quote
        return await swap(
            api_clients=api_clients,
            from_account=account,
            swap_options=SwapOptions(swap_quote=swap_data),
            swap_strategy=AccountSwapStrategy(),
        )

    else:
        # Direct parameters path
        # Import here to avoid circular imports
        from cdp.evm_client import EvmClient

        # Create an EVM client instance
        evm_client = EvmClient(api_clients)

        # Create the swap quote from parameters
        swap_quote = await evm_client.create_swap_quote(
            from_token=options.from_token,
            to_token=options.to_token,
            from_amount=options.from_amount,
            network=options.network,
            taker=options.taker or account.address,
            slippage_bps=options.slippage_bps,
            from_account=account,
        )

        # Execute the swap
        return await swap(
            api_clients=api_clients,
            from_account=account,
            swap_options=SwapOptions(swap_quote=swap_quote),
            swap_strategy=AccountSwapStrategy(),
        )
