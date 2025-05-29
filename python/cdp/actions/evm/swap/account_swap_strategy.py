"""Swap strategy for regular EVM accounts."""

from web3 import Web3

from cdp.actions.evm.swap.types import SwapOptions, SwapQuote, SwapResult
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

        # Create the swap transaction
        swap_tx = await evm_client.create_swap(
            from_asset=swap_options.from_asset,
            to_asset=swap_options.to_asset,
            amount=swap_options.amount,
            network=swap_options.network,
            wallet_address=from_account.address,
            slippage_percentage=swap_options.slippage_percentage or 0.5,
        )

        # Get the transaction data (will be modified if Permit2 is required)
        tx_data = swap_tx.data

        # Check if Permit2 signature is required
        if swap_tx.requires_signature and swap_tx.permit2_data:
            # Sign the Permit2 EIP-712 message
            eip712_data = swap_tx.permit2_data.eip712

            # Extract domain, types, primary type, and message from EIP-712 data
            domain = eip712_data.get("domain", {})
            types = eip712_data.get("types", {})
            primary_type = eip712_data.get("primaryType", "PermitTransferFrom")
            message = eip712_data.get("message", {})

            # Sign the typed data
            signature = await from_account.sign_typed_data(
                domain=domain,
                types=types,
                primary_type=primary_type,
                message=message,
            )

            # Remove 0x prefix from signature if present
            sig_hex = signature[2:] if signature.startswith("0x") else signature

            # Calculate signature length in bytes
            sig_length = len(sig_hex) // 2  # Convert hex chars to bytes

            # Convert length to 32-byte hex value (64 hex chars)
            # This is equivalent to TypeScript's numberToHex(size, { size: 32 })
            sig_length_hex = f"{sig_length:064x}"  # 32 bytes = 64 hex chars

            # Remove 0x prefix from transaction data if present
            if tx_data.startswith("0x"):
                tx_data = tx_data[2:]

            # Append length and signature to the transaction data
            # This matches the TypeScript implementation:
            # concat([txData, signatureLengthInHex, signature])
            tx_data = "0x" + tx_data + sig_length_hex + sig_hex

        # Send the transaction
        # Create a proper transaction request with checksum address
        w3 = Web3()
        transaction_request = TransactionRequestEIP1559(
            to=w3.to_checksum_address(swap_tx.to),
            data=tx_data,
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
