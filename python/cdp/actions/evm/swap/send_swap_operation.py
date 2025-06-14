"""Send swap operation function for EVM smart accounts."""

from eth_account.signers.base import BaseAccount

from cdp.actions.evm.send_user_operation import send_user_operation
from cdp.actions.evm.sign_and_wrap_typed_data_for_smart_account import (
    SignAndWrapTypedDataForSmartAccountOptions,
    sign_and_wrap_typed_data_for_smart_account,
)
from cdp.actions.evm.swap.create_swap_quote import create_swap_quote
from cdp.actions.evm.swap.types import (
    SmartAccountSwapResult,
    SwapUnavailableResult,
)
from cdp.api_clients import ApiClients
from cdp.evm_call_types import EncodedCall
from cdp.utils import create_deterministic_uuid_v4


class SendSwapOperationOptions:
    """Options for sending a swap operation via smart account."""

    def __init__(
        self,
        smart_account,
        network: str,
        paymaster_url: str | None = None,
        idempotency_key: str | None = None,
        **swap_params,
    ):
        """Initialize the options.

        Args:
            smart_account: The smart account that will execute the swap
            network: The network to execute on
            paymaster_url: Optional paymaster URL for gas sponsorship
            idempotency_key: Optional idempotency key for safe retryable requests
            **swap_params: Either swap_quote OR inline parameters (from_token, to_token, etc.)

        """
        self.smart_account = smart_account
        self.network = network
        self.paymaster_url = paymaster_url
        self.idempotency_key = idempotency_key

        # Handle discriminated union: either swap_quote OR inline parameters
        if "swap_quote" in swap_params:
            self.swap_quote = swap_params["swap_quote"]
            self.is_quote_based = True
        else:
            # Inline parameters
            self.from_token = swap_params["from_token"]
            self.to_token = swap_params["to_token"]
            self.from_amount = swap_params["from_amount"]
            self.taker = swap_params.get("taker", smart_account.address)
            self.slippage_bps = swap_params.get("slippage_bps", 100)
            self.is_quote_based = False


async def send_swap_operation(
    api_clients: ApiClients,
    options: SendSwapOperationOptions,
) -> SmartAccountSwapResult:
    """Send a swap operation to the blockchain via a smart account user operation.

    Handles any permit2 signatures required for the swap using smart account signature wrapping.

    Args:
        api_clients: The API clients instance
        options: The options for the swap operation

    Returns:
        SmartAccountSwapResult: The user operation result

    Raises:
        ValueError: If liquidity is not available for the swap
        Exception: If the swap operation fails

    Examples:
        ```python
        # Using pre-created swap quote
        options = SendSwapOperationOptions(
            smart_account=smart_account,
            network="base",
            swap_quote=quote,
            idempotency_key="..."
        )

        # Using inline parameters
        options = SendSwapOperationOptions(
            smart_account=smart_account,
            network="base",
            from_token="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
            to_token="0x4200000000000000000000000000000000000006",
            from_amount="100000000",
            slippage_bps=100,
            idempotency_key="..."
        )

        result = await send_swap_operation(api_clients, options)
        print(f"User operation hash: {result.user_op_hash}")
        ```

    """
    # Determine which pattern is being used and get swap data
    swap_data = None

    if options.is_quote_based:
        # Pattern 1: Pre-created swap quote
        swap_data = options.swap_quote

    else:
        # Pattern 2: Inline parameters
        # Generate deterministic idempotency key for create_swap_quote if base key provided
        quote_idempotency_key = None
        if options.idempotency_key:
            quote_idempotency_key = create_deterministic_uuid_v4(options.idempotency_key, "quote")

        # Create the swap quote from parameters
        swap_data = await create_swap_quote(
            api_clients=api_clients,
            from_token=options.from_token,
            to_token=options.to_token,
            from_amount=options.from_amount,
            network=options.network,
            taker=options.taker,
            slippage_bps=options.slippage_bps,
            signer_address=options.smart_account.owners[0].address,  # Owner signs for smart account
            idempotency_key=quote_idempotency_key,
        )

    # Check if liquidity is unavailable
    if isinstance(swap_data, SwapUnavailableResult):
        raise ValueError("Swap unavailable: Insufficient liquidity")

    # Get the transaction data and modify it if needed for Permit2
    tx_data = swap_data.data

    if swap_data.requires_signature and swap_data.permit2_data:
        # Generate deterministic idempotency key for Permit2 signing if base key provided
        permit2_idempotency_key = None
        if options.idempotency_key:
            permit2_idempotency_key = create_deterministic_uuid_v4(
                options.idempotency_key, "permit2"
            )

        # Create a minimal smart account interface for signing
        class SmartAccountInterface:
            def __init__(self, address: str, owners: list[BaseAccount]):
                self.address = address
                self.owners = owners

        smart_account_interface = SmartAccountInterface(
            options.smart_account.address, [options.smart_account.owners[0]]
        )

        # Sign and wrap the permit2 typed data according to the Coinbase Smart Wallet contract requirements
        sign_result = await sign_and_wrap_typed_data_for_smart_account(
            api_clients,
            SignAndWrapTypedDataForSmartAccountOptions(
                smart_account=smart_account_interface,
                chain_id=1 if options.network == "ethereum" else 8453,  # Base chain ID
                typed_data=swap_data.permit2_data.eip712,
                owner_index=0,
                idempotency_key=permit2_idempotency_key,
            ),
        )

        # Calculate the Permit2 signature length as a 32-byte hex value
        # Remove 0x prefix if present
        sig_hex = (
            sign_result.signature[2:]
            if sign_result.signature.startswith("0x")
            else sign_result.signature
        )
        sig_length = len(sig_hex) // 2  # Convert hex chars to bytes
        permit2_signature_length_hex = f"{sig_length:064x}"  # 32 bytes = 64 hex chars

        # Append the Permit2 signature length and signature to the transaction data
        tx_data = swap_data.data + permit2_signature_length_hex + sig_hex

    # Create the contract call for the user operation
    contract_call = EncodedCall(
        to=swap_data.to,
        data=tx_data,
        value=int(swap_data.value) if swap_data.value else 0,
    )

    # Send the swap as a user operation
    user_operation = await send_user_operation(
        api_clients=api_clients,
        address=options.smart_account.address,
        owner=options.smart_account.owners[0],
        calls=[contract_call],
        network=options.network,
        paymaster_url=options.paymaster_url,
    )

    return SmartAccountSwapResult(
        user_op_hash=user_operation.user_op_hash,
        smart_account_address=options.smart_account.address,
        status=user_operation.status,
    )
