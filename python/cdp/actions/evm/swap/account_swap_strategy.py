"""Swap strategy for regular EVM accounts."""

from web3 import Web3

from cdp.actions.evm.swap.types import SwapOptions, SwapQuote, SwapResult
from cdp.actions.evm.swap.utils import calculate_minimum_amount_out
from cdp.api_clients import ApiClients
from cdp.evm_server_account import EvmServerAccount
from cdp.evm_transaction_types import TransactionRequestEIP1559


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
        # Import EVM client here to avoid circular imports
        from cdp.evm_client import EvmClient

        # Create an EVM client instance
        evm_client = EvmClient(api_clients)

        # Calculate minimum amount out based on slippage
        min_amount_out = calculate_minimum_amount_out(
            quote.to_amount, swap_options.slippage_percentage or 0.5
        )

        # Create the swap transaction
        swap_tx = await evm_client.create_swap(
            from_asset=swap_options.from_asset,
            to_asset=swap_options.to_asset,
            amount=swap_options.amount,
            network=swap_options.network,
            wallet_address=from_account.address,
            slippage_percentage=swap_options.slippage_percentage or 0.5,
        )

        # Send the transaction
        # Create a proper transaction request with checksum address
        w3 = Web3()
        transaction_request = TransactionRequestEIP1559(
            to=w3.to_checksum_address(swap_tx.to),
            data=swap_tx.data,
            value=swap_tx.value,
        )

        tx_hash = await from_account.send_transaction(
            transaction=transaction_request,
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
