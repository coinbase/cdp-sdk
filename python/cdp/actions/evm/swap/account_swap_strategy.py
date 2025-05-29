"""Swap strategy for regular EVM accounts."""

from cdp.actions.evm.swap.types import CreateSwapResult, SwapResult
from cdp.api_clients import ApiClients
from cdp.evm_server_account import EvmServerAccount
from cdp.evm_transaction_types import TransactionRequestEIP1559


class AccountSwapStrategy:
    """Swap strategy for regular EVM accounts."""

    async def execute_swap(
        self,
        api_clients: ApiClients,
        from_account: EvmServerAccount,
        swap_data: CreateSwapResult,
        network: str | None = None,
    ) -> SwapResult:
        """Execute a swap for a regular EVM account.

        Args:
            api_clients: The API clients instance
            from_account: The account to execute the swap from
            swap_data: The swap data from createSwap
            network: The network to execute on (optional, can be determined from account)

        Returns:
            SwapResult: The result of the swap transaction

        """
        # If network not provided, get it from the account
        if network is None:
            # For now, we'll require network to be passed
            # In the future, we could store network info on the account
            raise ValueError("Network must be provided for swap execution")

        # Get current permit2 data for signature
        permit2_data = await api_clients.evm_swaps.get_swap_permit2_data(
            from_account.address,
            swap_data.to,
            swap_data.data,
        )

        # Sign the permit2 message
        typed_data = permit2_data["typed_data"]
        signature = from_account.sign_typed_data(typed_data)

        # Append signature data to calldata
        # Format: append signature length (130 chars = 65 bytes) and signature
        # Remove 0x prefix if present
        sig_hex = signature[2:] if signature.startswith("0x") else signature
        calldata_with_signature = swap_data.data + f"{130:064x}" + sig_hex

        # Create the transaction request
        tx_request = TransactionRequestEIP1559(
            to=swap_data.to,
            data=calldata_with_signature,
            value=int(swap_data.value) if swap_data.value else 0,
        )

        # Set gas parameters if provided
        if swap_data.gas_limit:
            tx_request.gas = swap_data.gas_limit
        if swap_data.max_fee_per_gas:
            tx_request.maxFeePerGas = int(swap_data.max_fee_per_gas)
        if swap_data.max_priority_fee_per_gas:
            tx_request.maxPriorityFeePerGas = int(swap_data.max_priority_fee_per_gas)

        # Send the transaction
        tx_hash = await from_account.send_transaction(tx_request)

        # Return the swap result
        return SwapResult(
            transaction_hash=tx_hash,
            from_token=swap_data.from_token,
            to_token=swap_data.to_token,
            from_amount=swap_data.from_amount,
            to_amount=swap_data.to_amount,
            quote_id=swap_data.quote_id,
            network=network,
        )


# Create a singleton instance
account_swap_strategy = AccountSwapStrategy()
