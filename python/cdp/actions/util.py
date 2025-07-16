from decimal import Decimal


def format_units(amount, decimals):
    """Convert an amount from atomic units to decimal units.

    Args:
        amount: The amount in atomic units, e.g. wei.
        decimals: The number of decimal places to convert to (e.g. 18 for ETH, 6 for USDC).

    Returns:
        str: The amount formatted as a decimal string (e.g. "1.23" for 1.23 ETH).

    """
    return str(Decimal(amount) / (Decimal(10) ** decimals))
