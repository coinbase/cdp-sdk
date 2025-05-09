import inspect
import re

from eth_account.typed_transactions import DynamicFeeTransaction


async def ensure_awaitable(func, *args, **kwargs):
    """Ensure a function call returns an awaitable result.

    Works with both synchronous and asynchronous functions.

    Args:
        func: The function to call
        *args: Arguments to pass to the function
        **kwargs: Arguments to pass to the function

    Returns:
        The awaited result of the function

    """
    result = func(*args, **kwargs)

    if inspect.isawaitable(result):
        return await result
    return result


def serialize_unsigned_transaction(transaction: DynamicFeeTransaction) -> str:
    """Serialize an unsigned transaction.

    Args:
        transaction: The transaction to serialize

    Returns: The serialized transaction

    """
    transaction.dictionary["v"] = 0
    transaction.dictionary["r"] = 0
    transaction.dictionary["s"] = 0
    payload = transaction.payload()
    serialized_tx = bytes([transaction.transaction_type]) + payload

    return f"0x{serialized_tx.hex()}"


class InvalidDecimalNumberError(Exception):
    """Exception raised for invalid decimal number strings.

    Args:
        value: The invalid decimal number string

    """

    def __init__(self, value):
        self.value = value
        super().__init__(f"Invalid decimal number: {value}")


def parse_units(value: str, decimals: int) -> int:
    """Parse a decimal number string into an integer.

    Args:
        value: The decimal number string to parse
        decimals: The number of decimal places

    Returns: The parsed integer

    Raises:
        InvalidDecimalNumberError: If the value is not a valid decimal number

    """
    if not re.match(r"^(-?)([0-9]*)\.?([0-9]*)$", value):
        raise InvalidDecimalNumberError(value)

    if "." in value:
        integer, fraction = value.split(".")
    else:
        integer, fraction = value, "0"

    negative = integer.startswith("-")
    if negative:
        integer = integer[1:]

    # trim trailing zeros
    fraction = fraction.rstrip("0")

    # round off if the fraction is larger than the number of decimals
    if decimals == 0:
        if round(float(f"0.{fraction}")) == 1:
            integer = str(int(integer) + 1)
        fraction = ""
    elif len(fraction) > decimals:
        left = fraction[: decimals - 1]
        unit = fraction[decimals - 1 : decimals]
        right = fraction[decimals:]

        rounded = round(float(f"{unit}.{right}"))
        fraction = f"{int(left) + 1}0".zfill(len(left) + 1) if rounded > 9 else f"{left}{rounded}"

        if len(fraction) > decimals:
            fraction = fraction[1:]
            integer = str(int(integer) + 1)

        fraction = fraction[:decimals]
    else:
        fraction = fraction.ljust(decimals, "0")

    result_str = f"{'-' if negative else ''}{integer}{fraction}"
    return int(result_str)
