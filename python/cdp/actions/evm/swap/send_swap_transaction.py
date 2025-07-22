"""Send swap transaction function for EVM accounts."""

from typing import TYPE_CHECKING

from web3 import Web3

from cdp.actions.evm.send_transaction import send_transaction
from cdp.actions.evm.swap.create_swap_quote import create_swap_quote
from cdp.actions.evm.swap.types import (
    AccountSwapResult,
    InlineSendSwapTransactionOptions,
    QuoteBasedSendSwapTransactionOptions,
    SendSwapTransactionOptions,
    SwapUnavailableResult,
)
from cdp.evm_transaction_types import TransactionRequestEIP1559
from cdp.openapi_client.models.eip712_domain import EIP712Domain
from cdp.openapi_client.models.eip712_message import EIP712Message
from cdp.utils import create_deterministic_uuid_v4

if TYPE_CHECKING:
    from cdp.api_clients import ApiClients


async def send_swap_transaction(
    api_clients: "ApiClients",
    options: SendSwapTransactionOptions,
) -> AccountSwapResult:
    """Send a swap transaction using either a pre-created quote or inline parameters.

    This function executes a swap using a either a pre-created quote created by create_swap_quote
    or inline parameters.

    Args:
        api_clients: The API clients instance
        options: Either QuoteBasedSendSwapTransactionOptions or InlineSendSwapTransactionOptions

    Returns:
        AccountSwapResult: The result of the swap transaction

    Raises:
        ValueError: If parameters are invalid or liquidity is unavailable
        Exception: If the swap fails

    Example:
        ```python
        # Using pre-created quote
        result = await send_swap_transaction(
            api_clients=api_clients,
            options=QuoteBasedSendSwapTransactionOptions(
                address="0x742d35Cc6634C0532925a3b844Bc9e7595f1234",
                swap_quote=quote,
                idempotency_key="..."
            )
        )

        # Using inline parameters
        result = await send_swap_transaction(
            api_clients=api_clients,
            options=InlineSendSwapTransactionOptions(
                address="0x742d35Cc6634C0532925a3b844Bc9e7595f1234",
                network="base",
                from_token="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
                to_token="0x4200000000000000000000000000000000000006",
                from_amount="100000000",
                taker="0x742d35Cc6634C0532925a3b844Bc9e7595f1234",
                slippage_bps=100
            )
        )
        ```

    """
    # Determine which pattern is being used and get swap data
    swap_data = None

    if isinstance(options, QuoteBasedSendSwapTransactionOptions):
        # Pattern 1: Pre-created swap quote
        swap_data = options.swap_quote

    elif isinstance(options, InlineSendSwapTransactionOptions):
        # Pattern 2: Inline parameters
        # Generate deterministic idempotency key for create_swap_quote if base key provided
        quote_idempotency_key = None
        if options.idempotency_key:
            quote_idempotency_key = create_deterministic_uuid_v4(options.idempotency_key, "quote")

        # Create the swap quote from parameters
        created_swap_quote = await create_swap_quote(
            api_clients=api_clients,
            from_token=options.from_token,
            to_token=options.to_token,
            from_amount=options.from_amount,
            network=options.network,
            taker=options.taker,
            slippage_bps=options.slippage_bps,
            idempotency_key=quote_idempotency_key,
        )

        # Check if liquidity is unavailable
        if isinstance(created_swap_quote, SwapUnavailableResult):
            raise ValueError("Swap unavailable: Insufficient liquidity")

        swap_data = created_swap_quote

    else:
        raise ValueError(f"Invalid options type: {type(options)}")

    # Handle Permit2 signature if required (common for both patterns)
    permit2_signature = None
    if swap_data.requires_signature and swap_data.permit2_data:
        # Generate deterministic idempotency key for Permit2 signing if base key provided
        permit2_idempotency_key = None
        if options.idempotency_key:
            permit2_idempotency_key = create_deterministic_uuid_v4(
                options.idempotency_key, "permit2"
            )

        # Sign the Permit2 typed data
        typed_data = swap_data.permit2_data.eip712
        response = await api_clients.evm_accounts.sign_evm_typed_data(
            address=options.address,
            eip712_message=EIP712Message(
                domain=EIP712Domain(
                    name=typed_data["domain"].get("name"),
                    version=typed_data["domain"].get("version"),
                    chain_id=typed_data["domain"].get("chainId"),
                    verifying_contract=typed_data["domain"].get("verifyingContract"),
                    salt=typed_data["domain"].get("salt"),
                ),
                types=typed_data["types"],
                primary_type=typed_data["primaryType"],
                message=typed_data["message"],
            ),
            x_idempotency_key=permit2_idempotency_key,
        )
        permit2_signature = response.signature

    # Handle Permit2 signature if provided
    if permit2_signature:
        # Append signature data to calldata
        # Format: append signature length (as 32-byte hex) and signature
        # Remove 0x prefix if present
        sig_hex = permit2_signature[2:] if permit2_signature.startswith("0x") else permit2_signature

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

    # Ensure both addresses are checksummed
    to_address = Web3.to_checksum_address(swap_data.to)
    from_address = Web3.to_checksum_address(options.address)

    # Create the transaction request
    tx_request = TransactionRequestEIP1559(
        to=to_address,
        data=calldata,
        value=int(swap_data.value) if swap_data.value else 0,
        gas=swap_data.gas_limit,
    )

    # Set gas parameters if provided
    if swap_data.max_fee_per_gas:
        tx_request.maxFeePerGas = int(swap_data.max_fee_per_gas)
    if swap_data.max_priority_fee_per_gas:
        tx_request.maxPriorityFeePerGas = int(swap_data.max_priority_fee_per_gas)

    # Send the transaction directly
    tx_hash = await send_transaction(
        evm_accounts=api_clients.evm_accounts,
        address=from_address,
        transaction=tx_request,
        network=swap_data.network,
        idempotency_key=options.idempotency_key,
    )

    # Return the transaction hash
    return AccountSwapResult(transaction_hash=tx_hash)
