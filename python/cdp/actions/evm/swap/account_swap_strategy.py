"""Swap strategy for regular EVM accounts."""

from cdp.api_clients import ApiClients
from cdp.actions.evm.swap.types import SwapOptions, SwapQuote, SwapResult, SwapStrategy
from cdp.actions.evm.swap.utils import calculate_minimum_amount_out
from cdp.evm_server_account import EvmServerAccount


class AccountSwapStrategy:
    """Swap strategy for regular EVM accounts."""
    
    async def execute_swap(
        self,
        api_clients: ApiClients,
        from_account: EvmServerAccount,
        swap_options: SwapOptions,
        quote: SwapQuote,
    ) -> SwapResult:
        """Execute a swap for a regular EVM account.
        
        Args:
            api_clients: The API clients instance
            from_account: The account executing the swap
            swap_options: The swap options
            quote: The swap quote
            
        Returns:
            SwapResult: The result of the swap
        """
        # Calculate minimum amount out based on slippage
        min_amount_out = calculate_minimum_amount_out(
            quote.to_amount,
            swap_options.slippage_percentage or 0.5
        )
        
        # Create the swap transaction
        swap_tx = await api_clients.evm.create_swap(
            from_address=from_account.address,
            from_asset=swap_options.from_asset,
            to_asset=swap_options.to_asset,
            amount=swap_options.amount,
            network=swap_options.network,
            min_amount_out=min_amount_out,
            quote_id=quote.quote_id,
        )
        
        # Send the transaction
        tx_hash = await api_clients.evm.send_transaction(
            address=from_account.address,
            transaction=swap_tx.transaction,
            network=swap_options.network,
        )
        
        # Wait for transaction confirmation
        # TODO: Implement transaction waiting logic
        
        return SwapResult(
            transaction_hash=tx_hash,
            from_asset=swap_options.from_asset,
            to_asset=swap_options.to_asset,
            from_amount=str(swap_options.amount),
            to_amount=quote.to_amount,
            status="completed",
        )


# Create a singleton instance
account_swap_strategy = AccountSwapStrategy() 