"""Send swap transaction function for EVM accounts."""

from typing import TYPE_CHECKING

from cdp.actions.evm.swap.types import QuoteSwapResult, SwapOptions, SwapResult

if TYPE_CHECKING:
    from cdp.api_clients import ApiClients


async def send_swap_transaction(
    api_clients: "ApiClients",
    address: str,
    network: str,
    swap_quote: QuoteSwapResult,
) -> SwapResult:
    """Send a swap transaction using a pre-created quote.

    This function executes a swap using a quote created by create_swap_quote,
    matching the TypeScript SDK pattern.

    Args:
        api_clients: The API clients instance
        address: The address executing the swap
        network: The network to execute on
        swap_quote: The pre-created swap quote

    Returns:
        SwapResult: The result of the swap transaction

    Raises:
        ValueError: If the quote is invalid
        Exception: If the swap fails

    Example:
        ```python
        # First create a quote
        quote = await create_swap_quote(
            api_clients=api_clients,
            from_token="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",  # USDC
            to_token="0x4200000000000000000000000000000000000006",  # WETH
            from_amount="100000000",
            network="base",
            taker=address,
            slippage_bps=100
        )

        # Then execute it
        result = await send_swap_transaction(
            api_clients=api_clients,
            address=address,
            network="base",
            swap_quote=quote
        )
        ```

    """
    # Import here to avoid circular imports
    from cdp.actions.evm.swap.account_swap_strategy import AccountSwapStrategy
    from cdp.actions.evm.swap.swap import swap
    from cdp.evm_client import EvmClient

    # Get the account from the address
    evm_client = EvmClient(api_clients)
    account = await evm_client.get_account(address=address)

    # Execute the swap using the account
    return await swap(
        api_clients=api_clients,
        from_account=account,
        swap_options=SwapOptions(swap_quote=swap_quote),
        swap_strategy=AccountSwapStrategy(),
    )
