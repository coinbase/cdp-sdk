"""Utility functions for swap operations."""


from cdp.actions.evm.swap.constants import TOKEN_ADDRESSES


def resolve_token_address(token: str, network: str) -> str:
    """Resolve a token symbol to its contract address.

    Args:
        token: Token symbol or contract address
        network: Network name

    Returns:
        The contract address for the token

    Raises:
        ValueError: If token is not supported on the network

    """
    # If it's already an address, return it (normalized to lowercase)
    if token.startswith("0x") and len(token) == 42:
        return token.lower()

    # Convert to lowercase for case-insensitive lookup
    token_lower = token.lower()

    # Check if token exists in our mapping
    if token_lower not in TOKEN_ADDRESSES:
        raise ValueError(f"Unknown token: {token}")

    # Check if token is supported on this network
    if network not in TOKEN_ADDRESSES[token_lower]:
        raise ValueError(f"Token {token} is not supported on network {network}")

    return TOKEN_ADDRESSES[token_lower][network].lower()


def format_amount(amount: str | int, decimals: int = 18) -> str:
    """Format an amount to the correct decimal representation.

    Args:
        amount: The amount to format (can be string with decimals or integer)
        decimals: Number of decimals for the token

    Returns:
        The formatted amount as a string in smallest unit

    """
    if isinstance(amount, int):
        return str(amount)

    # Handle string amounts with decimals
    if "." in str(amount):
        parts = str(amount).split(".")
        integer_part = parts[0] or "0"
        decimal_part = parts[1]

        # Pad or truncate decimal part to match token decimals
        if len(decimal_part) > decimals:
            decimal_part = decimal_part[:decimals]
        else:
            decimal_part = decimal_part.ljust(decimals, "0")

        # Combine parts and remove leading zeros
        result = integer_part + decimal_part

        # Special case for zero
        if all(c == "0" for c in result):
            return "0"

        # Remove leading zeros but keep at least one digit
        return result.lstrip("0") or "0"
    else:
        # No decimal point
        if str(amount) == "0":
            return "0"
        # For whole numbers, multiply by 10^decimals
        return str(int(amount) * (10**decimals))


def calculate_minimum_amount_out(amount: str, slippage_percentage: float) -> str:
    """Calculate the minimum amount out based on slippage tolerance.

    Args:
        amount: The expected output amount
        slippage_percentage: The slippage percentage (0-10)

    Returns:
        The minimum acceptable output amount

    """
    amount_int = int(amount)
    slippage_factor = 1 - (slippage_percentage / 100)
    min_amount = int(amount_int * slippage_factor)
    return str(min_amount)
