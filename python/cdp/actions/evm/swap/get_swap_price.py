"""Get swap price implementation."""

import datetime
import hashlib
import json
from typing import Any

from cdp.actions.evm.swap.types import SwapPriceResult
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
    idempotency_key: str | None = None,
) -> SwapPriceResult:
    """Get a price estimate for swapping tokens on EVM networks.

    Gets a price estimate without creating a firm quote. This is useful for
    displaying estimated prices without committing to the swap.

    Args:
        api_clients: The API clients instance
        from_token: The contract address of the token to swap from
        to_token: The contract address of the token to swap to
        from_amount: The amount to swap from (in smallest unit)
        network: The network to get the price on ("base" or "ethereum")
        taker: The address that will execute the swap
        idempotency_key: Optional idempotency key for safe retryable requests

    Returns:
        SwapPriceResult: The swap price with estimated output amount

    Raises:
        ValueError: If parameters are invalid
        Exception: If the API request fails

    Examples:
        Get a price estimate for swapping USDC to WETH:
            >>> price = await get_swap_price(
            ...     api_clients=api_clients,
            ...     from_token="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",  # USDC
            ...     to_token="0x4200000000000000000000000000000000000006",  # WETH
            ...     from_amount="100000000",  # 100 USDC (6 decimals)
            ...     network="base",
            ...     taker="0x742d35Cc6634C0532925a3b844Bc9e7595f1234",
            ...     idempotency_key="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            ... )

    """
    # Convert amount to string if it's an integer
    amount_str = str(from_amount)

    # Convert network to EvmSwapsNetwork enum
    network_enum = EvmSwapsNetwork(network)

    # Get quote from API - use the raw response to avoid oneOf deserialization issues
    headers = {}
    if idempotency_key:
        headers["X-Idempotency-Key"] = idempotency_key

    response = await api_clients.evm_swaps.get_evm_swap_price_without_preload_content(
        network=network_enum,
        to_token=to_token,
        from_token=from_token,
        from_amount=amount_str,
        taker=taker,
        _headers=headers,
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

    # Convert response to SwapPriceResult
    return SwapPriceResult(
        quote_id=quote_id,
        from_token=from_token,
        to_token=to_token,
        from_amount=amount_str,
        to_amount=to_amount,
        price_ratio=price_ratio,
        expires_at=expires_at.isoformat() + "Z",
    )
