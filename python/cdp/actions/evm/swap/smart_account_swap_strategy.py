"""Swap strategy for EVM smart accounts."""

from cdp.actions.evm.send_user_operation import send_user_operation
from cdp.actions.evm.swap.types import SwapOptions, SwapQuote, SwapResult
from cdp.actions.evm.wait_for_user_operation import wait_for_user_operation
from cdp.api_clients import ApiClients
from cdp.evm_call_types import EncodedCall
from cdp.evm_smart_account import EvmSmartAccount


class SmartAccountSwapStrategy:
    """Swap strategy for EVM smart accounts."""

    async def execute_swap(
        self,
        api_clients: ApiClients,
        from_account: EvmSmartAccount,
        swap_options: SwapOptions,
        quote: SwapQuote,
    ) -> SwapResult:
        """Execute a swap for a smart account using user operations.

        Args:
            api_clients: The API clients instance
            from_account: The smart account executing the swap
            swap_options: The swap options
            quote: The swap quote

        Returns:
            SwapResult: The result of the swap

        """
        # Import EVM client here to avoid circular imports
        from cdp.evm_client import EvmClient

        # Create an EVM client instance
        evm_client = EvmClient(api_clients)

        # Create the swap transaction data
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

        # Handle Permit2 signature if required
        if swap_tx.requires_signature and swap_tx.permit2_data:
            # For smart accounts, we need to get the owner to sign the Permit2 message
            owner = from_account.owners[0]

            # Sign the Permit2 EIP-712 message
            eip712_data = swap_tx.permit2_data.eip712

            # Extract domain, types, primary type, and message from EIP-712 data
            domain = eip712_data.get("domain", {})
            types = eip712_data.get("types", {})
            primary_type = eip712_data.get("primaryType", "PermitTransferFrom")
            message = eip712_data.get("message", {})

            # Sign the typed data with the owner account
            signature = await owner.sign_typed_data(
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

        # Extract the call data from the swap transaction
        # The swap transaction should contain the target contract and calldata
        swap_call = EncodedCall(
            to=swap_tx.to,
            data=tx_data,
            value=swap_tx.value if hasattr(swap_tx, "value") else 0,
        )

        # Send the user operation
        user_op = await send_user_operation(
            api_clients=api_clients,
            address=from_account.address,
            owner=from_account.owners[0],
            calls=[swap_call],
            network=swap_options.network,
            paymaster_url=None,  # Use default paymaster for gasless swaps
        )

        # Wait for the user operation to be confirmed
        confirmed_op = await wait_for_user_operation(
            api_clients=api_clients,
            smart_account_address=from_account.address,
            user_op_hash=user_op.user_op_hash,
            timeout_seconds=30,
        )

        # Map the user operation status to swap status
        if confirmed_op.status == "complete":
            status = "completed"
        elif confirmed_op.status == "failed":
            status = "failed"
        else:
            status = confirmed_op.status

        return SwapResult(
            transaction_hash=confirmed_op.transaction_hash or "",
            from_asset=swap_options.from_asset,
            to_asset=swap_options.to_asset,
            from_amount=str(swap_options.amount),
            to_amount=quote.to_amount,
            status=status,
        )


# Create a singleton instance
smart_account_swap_strategy = SmartAccountSwapStrategy()
