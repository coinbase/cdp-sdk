"""Get swap price implementation."""

import datetime
import hashlib
import json
from typing import Any

from cdp.actions.evm.swap.types import SwapQuote
from cdp.api_clients import ApiClients
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


async def get_swap_price(
    api_clients: ApiClients,
    from_token: str,
    to_token: str,
    from_amount: str | int,
    network: str,
    taker: str,
) -> SwapQuote:
    """Get a swap price for swapping tokens.

    Args:
        api_clients: The API clients instance
        from_token: The contract address of the token to swap from
        to_token: The contract address of the token to swap to
        from_amount: The amount to swap from (in smallest unit or as string)
        network: The network to get the price for
        taker: The address that will perform the swap

    Returns:
        SwapQuote: The swap price with estimated output amount

    """
    # Convert amount to string if it's an integer
    amount_str = str(from_amount)

    # Normalize addresses to lowercase
    from_address = from_token.lower()
    to_address = to_token.lower()

    # Convert network to EvmSwapsNetwork enum
    network_enum = EvmSwapsNetwork(network)

    # Get quote from API - use the raw response to avoid oneOf deserialization issues
    response = await api_clients.evm_swaps.get_evm_swap_price_without_preload_content(
        network=network_enum,
        to_token=to_address,
        from_token=from_address,
        from_amount=amount_str,
        taker=taker,
    )

    # Read and parse the response manually
    raw_data = await response.read()
    response_json = _parse_json_response(raw_data, "swap quote API")

    # Check if liquidity is available
    _check_swap_liquidity(response_json)

    # Extract the output amount from response
    # API uses toAmount/fromAmount but we need to map to our quote model
    to_amount = response_json.get("toAmount")
    if not to_amount:
        raise ValueError("Missing toAmount in response")

    # Calculate price ratio
    from_amount_decimal = float(amount_str)
    to_amount_decimal = float(to_amount)
    price_ratio = str(to_amount_decimal / from_amount_decimal) if from_amount_decimal > 0 else "0"

    # Generate a quote ID from response data
    quote_id = _generate_swap_quote_id(from_token, to_token, amount_str, to_amount)

    # Get expiry time (if available in response)
    expires_at = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(
        minutes=5
    )  # Default 5 min expiry

    # Convert response to SwapQuote
    return SwapQuote(
        quote_id=quote_id,
        from_token=from_token,
        to_token=to_token,
        from_amount=amount_str,
        to_amount=to_amount,
        price_ratio=price_ratio,
        expires_at=expires_at.isoformat() + "Z",
    )
