"""Swap strategy for regular EVM accounts."""

from typing import TYPE_CHECKING

from web3 import Web3

from cdp.actions.evm.swap.types import QuoteSwapResult, SwapResult
from cdp.api_clients import ApiClients
from cdp.evm_transaction_types import TransactionRequestEIP1559

if TYPE_CHECKING:
    from cdp.evm_server_account import EvmServerAccount


class AccountSwapStrategy:
    """Swap strategy for regular EVM accounts."""

    async def execute_swap(
        self,
        api_clients: ApiClients,
        from_account: "EvmServerAccount",
        swap_data: QuoteSwapResult,
        network: str,
        permit2_signature: str | None = None,
    ) -> SwapResult:
        """Execute a swap for a regular EVM account.

        Args:
            api_clients: The API clients instance
            from_account: The account to execute the swap from
            swap_data: The swap data from create_swap_quote
            network: The network to execute on
            permit2_signature: Optional Permit2 signature for ERC20 swaps

        Returns:
            SwapResult: The result of the swap transaction

        """
        # Handle Permit2 signature if provided
        if permit2_signature:
            # Append signature data to calldata
            # Format: append signature length (as 32-byte hex) and signature
            # Remove 0x prefix if present
            sig_hex = (
                permit2_signature[2:] if permit2_signature.startswith("0x") else permit2_signature
            )

            # Calculate signature length in bytes
            sig_length = len(sig_hex) // 2  # Convert hex chars to bytes

            # Convert length to 32-byte hex value (64 hex chars)
            # This matches TypeScript's numberToHex(size, { size: 32 })
            sig_length_hex = f"{sig_length:064x}"  # 32 bytes = 64 hex chars

            # Append length and signature to the calldata
            calldata = swap_data.data + sig_length_hex + sig_hex
        else:
            # Use calldata as-is (for swaps that don't need Permit2, like ETH swaps)
            calldata = swap_data.data

        # Ensure the to address is checksummed
        to_address = Web3.to_checksum_address(swap_data.to)

        # Create the transaction request
        tx_request = TransactionRequestEIP1559(
            to=to_address,
            data=calldata,
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
        tx_hash = await from_account.send_transaction(tx_request, network)

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
