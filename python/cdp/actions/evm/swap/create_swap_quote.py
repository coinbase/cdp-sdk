"""Create swap quote implementation."""

import hashlib
import json
from typing import Any

from cdp.actions.evm.swap.types import Permit2Data, SwapQuoteResult
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


def _check_swap_liquidity(response_json: dict[str, Any]) -> None:
    """Check if swap liquidity is available.

    Args:
        response_json: The parsed swap response

    Raises:
        ValueError: If liquidity is not available

    """
    if not response_json.get("liquidityAvailable", False):
        raise ValueError("Swap unavailable: Insufficient liquidity")


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
    taker: str,
    slippage_bps: int | None = None,
    from_account: Any | None = None,
) -> SwapQuoteResult:
    """Create a swap quote with transaction data.

    This method follows the OpenAPI spec field names.

    Args:
        api_clients: The API clients instance
        from_token: The contract address of the token to swap from
        to_token: The contract address of the token to swap to
        from_amount: The amount to swap from (in smallest unit)
        network: The network to create the swap on
        taker: The address that will execute the swap
        slippage_bps: The maximum slippage in basis points (100 = 1%)
        from_account: The account that will execute the swap (enables execute())

    Returns:
        SwapQuoteResult: The swap quote with transaction data

    """
    # Validate required parameters
    if not all([from_token, to_token, from_amount, network, taker]):
        raise ValueError(
            "All of from_token, to_token, from_amount, network, and taker are required"
        )

    # Convert amount to string if needed
    from_amount_str = str(from_amount)

    # Normalize addresses
    from_address = from_token.lower()
    to_address = to_token.lower()
    taker_address = taker.lower()

    # Convert network to enum
    network_enum = EvmSwapsNetwork(network)

    # Default slippage to 100 bps (1%) if not provided
    if slippage_bps is None:
        slippage_bps = 100

    # Create swap request
    request = CreateEvmSwapQuoteRequest(
        network=network_enum,
        to_token=to_address,  # Note: API uses to_token for what user wants to buy
        from_token=from_address,  # and from_token for what user wants to sell
        from_amount=from_amount_str,
        taker=taker_address,
        slippage_bps=slippage_bps,
    )

    # Call API
    response = await api_clients.evm_swaps.create_evm_swap_quote_without_preload_content(request)

    # Parse response
    raw_data = await response.read()
    response_json = _parse_json_response(raw_data, "create swap API")

    # Check liquidity
    _check_swap_liquidity(response_json)

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

    # Convert to SwapQuoteResult
    result = SwapQuoteResult(
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

    # Set account and api_clients if provided to enable execute()
    if from_account is not None:
        result._from_account = from_account
        result._api_clients = api_clients

    return result
