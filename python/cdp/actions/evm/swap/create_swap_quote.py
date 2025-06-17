"""Create swap quote implementation."""

import hashlib
import json
from typing import Any

from cdp.actions.evm.swap.types import Permit2Data, QuoteSwapResult, SwapUnavailableResult
from cdp.api_clients import ApiClients
from cdp.openapi_client.models.create_evm_swap_quote_request import (
    CreateEvmSwapQuoteRequest,
)
from cdp.openapi_client.models.create_swap_quote_response import CreateSwapQuoteResponse
from cdp.openapi_client.models.evm_swaps_network import EvmSwapsNetwork


def _parse_json_response(raw_data: bytes, operation: str) -> dict[str, Any]:
    """Parse JSON response with common error handling.

    Args:
        raw_data: The raw response data
        operation: Description of the operation for error messages

    Returns:
        dict: Parsed JSON response

    Raises:
        ValueError: If response is empty or invalid JSON

    """
    if not raw_data:
        raise ValueError(f"Empty response from {operation}")

    try:
        return json.loads(raw_data.decode("utf-8"))
    except json.JSONDecodeError as e:
        raise ValueError(f"Invalid JSON response from {operation}: {e}") from e


def _generate_swap_quote_id(*components: Any) -> str:
    """Generate a quote ID from components.

    Args:
        *components: Variable number of components to hash

    Returns:
        str: A 16-character quote ID

    """
    data = ":".join(str(c) for c in components)
    return hashlib.sha256(data.encode()).hexdigest()[:16]


async def create_swap_quote(
    api_clients: ApiClients,
    from_token: str,
    to_token: str,
    from_amount: str | int,
    network: str,
    taker: str | None = None,
    slippage_bps: int | None = None,
    signer_address: str | None = None,
    smart_account: Any | None = None,
    paymaster_url: str | None = None,
    idempotency_key: str | None = None,
) -> QuoteSwapResult | SwapUnavailableResult:
    """Create a quote for swapping tokens on EVM networks.

    Creates a quote to swap one token for another, which can be executed later.
    Returns either a QuoteSwapResult with transaction details or a SwapUnavailableResult
    if liquidity is insufficient.

    Args:
        api_clients: The API clients instance
        from_token: The contract address of the token to swap from
        to_token: The contract address of the token to swap to
        from_amount: The amount to swap from (in smallest unit)
        network: The network to execute on ("base" or "ethereum")
        taker: The address that will execute the swap (required)
        slippage_bps: Maximum slippage in basis points (100 = 1%, default: 100)
        signer_address: The address that will sign the transaction (for smart accounts)
        smart_account: The smart account object (for smart account execute() support)
        paymaster_url: Optional paymaster URL for gas sponsorship (for smart accounts)
        idempotency_key: Optional idempotency key for safe retryable requests

    Returns:
        Union[QuoteSwapResult, SwapUnavailableResult]: Either a swap quote with
            transaction details or an unavailable result if liquidity is insufficient

    Raises:
        ValueError: If parameters are invalid
        Exception: If the API request fails

    Examples:
        Create a swap quote for 100 USDC to WETH:
            >>> quote = await create_swap_quote(
            ...     api_clients=cdp.api_clients,
            ...     from_token="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",  # USDC
            ...     to_token="0x4200000000000000000000000000000000000006",  # WETH
            ...     from_amount="100000000",  # 100 USDC (6 decimals)
            ...     network="base",
            ...     taker="0x742d35Cc6634C0532925a3b844Bc9e7595f1234",
            ...     slippage_bps=100,  # 1% slippage
            ...     idempotency_key="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            ... )

        Execute the quote:
            >>> if hasattr(quote, 'execute'):
            ...     tx_hash = await quote.execute()

    """
    # Validate required parameters
    if not taker:
        raise ValueError("taker is required for create_swap_quote")

    # Convert amount to string if needed
    from_amount_str = str(from_amount)

    # Convert network to enum
    network_enum = EvmSwapsNetwork(network)

    # Default slippage to 100 bps (1%) if not provided
    if slippage_bps is None:
        slippage_bps = 100

    # Create swap request
    request = CreateEvmSwapQuoteRequest(
        network=network_enum,
        from_token=from_token,
        to_token=to_token,
        from_amount=from_amount_str,
        taker=taker,
        signer_address=signer_address,
        slippage_bps=slippage_bps,
    )

    # Call API
    headers = {}
    if idempotency_key:
        headers["X-Idempotency-Key"] = idempotency_key

    response = await api_clients.evm_swaps.create_evm_swap_quote_without_preload_content(
        request, _headers=headers
    )

    # Parse response
    raw_data = await response.read()
    response_json = _parse_json_response(raw_data, "create swap API")

    # Check if liquidity is unavailable
    if not response_json.get("liquidityAvailable", False):
        # Return the SwapUnavailableResult
        return SwapUnavailableResult(liquidity_available=False)

    # At this point we know liquidity is available
    # Parse as CreateSwapQuoteResponse
    swap_data = CreateSwapQuoteResponse.from_dict(response_json)

    # Extract transaction data
    tx_data = swap_data.transaction

    # Check if Permit2 signature is required
    permit2_data = None
    requires_signature = False

    if swap_data.permit2 and swap_data.permit2.eip712:
        # Convert eip712 to dict
        eip712_obj = swap_data.permit2.eip712
        if hasattr(eip712_obj, "to_dict"):
            eip712_dict = eip712_obj.to_dict()
        elif hasattr(eip712_obj, "model_dump"):
            eip712_dict = eip712_obj.model_dump()
        else:
            eip712_dict = dict(eip712_obj) if not isinstance(eip712_obj, dict) else eip712_obj

        permit2_data = Permit2Data(eip712=eip712_dict, hash=swap_data.permit2.hash)
        requires_signature = True

    # Generate quote ID
    quote_id = _generate_swap_quote_id(
        from_token, to_token, from_amount_str, swap_data.to_amount, network
    )

    # Convert to QuoteSwapResult
    result = QuoteSwapResult(
        liquidity_available=True,
        quote_id=quote_id,
        from_token=from_token,
        to_token=to_token,
        from_amount=from_amount_str,
        to_amount=swap_data.to_amount,  # API uses to_amount for what user receives
        min_to_amount=swap_data.min_to_amount,  # API uses min_to_amount
        to=tx_data.to,
        data=tx_data.data,
        value=tx_data.value if tx_data.value else "0",
        gas_limit=int(tx_data.gas) if hasattr(tx_data, "gas") and tx_data.gas else None,
        gas_price=tx_data.gas_price if hasattr(tx_data, "gas_price") else None,
        max_fee_per_gas=tx_data.max_fee_per_gas if hasattr(tx_data, "max_fee_per_gas") else None,
        max_priority_fee_per_gas=tx_data.max_priority_fee_per_gas
        if hasattr(tx_data, "max_priority_fee_per_gas")
        else None,
        network=network,
        permit2_data=permit2_data,
        requires_signature=requires_signature,
    )

    # Store taker and signer_address for execute()
    result._taker = taker
    result._signer_address = signer_address
    result._api_clients = api_clients
    result._smart_account = smart_account
    result._paymaster_url = paymaster_url

    return result
