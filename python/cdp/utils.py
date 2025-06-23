import hashlib
import inspect
import re
import uuid

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


def create_deterministic_uuid_v4(base_key: str, suffix: str = "") -> str:
    """Create a deterministic UUID v4 from a base key and optional suffix.

    This function generates a deterministic UUID by hashing the input components.
    Used for creating consistent idempotency keys across operations.

    Args:
        base_key: The base key to generate the UUID from
        suffix: An optional suffix to append to the base key

    Returns:
        str: A deterministic UUID v4 string

    Examples:
        >>> create_deterministic_uuid_v4("my-base-key", "permit2")
        "a1b2c3d4-e5f6-47a8-b9c0-d1e2f3a4b5c6"

        >>> create_deterministic_uuid_v4("my-base-key")
        "f1e2d3c4-b5a6-4798-8765-432109abcdef"

    """
    # Combine base key and suffix
    combined_key = f"{base_key}:{suffix}" if suffix else base_key

    # Generate hash from the combined key
    hash_bytes = hashlib.sha256(combined_key.encode("utf-8")).digest()

    # Use first 16 bytes to create UUID
    # Set version bits (4) and variant bits to make it a valid UUID v4
    uuid_bytes = bytearray(hash_bytes[:16])

    # Set version to 4 (0100 in binary)
    uuid_bytes[6] = (uuid_bytes[6] & 0x0F) | 0x40

    # Set variant bits (10 in binary)
    uuid_bytes[8] = (uuid_bytes[8] & 0x3F) | 0x80

    # Create UUID from bytes
    return str(uuid.UUID(bytes=bytes(uuid_bytes)))


def sort_keys(obj: dict) -> dict:
    """Recursively sorts object keys to ensure consistent JSON stringification.

    Args:
        obj: The object to sort

    Returns:
        A new object with sorted keys

    Examples:
        >>> sort_keys({"b": 1, "a": 2})
        {'a': 2, 'b': 1}

        >>> sort_keys({"b": {"d": 1, "c": 2}, "a": 3})
        {'a': 3, 'b': {'c': 2, 'd': 1}}

    """
    if not obj or not isinstance(obj, dict | list):
        return obj

    if isinstance(obj, list):
        return [sort_keys(item) for item in obj]

    return {key: sort_keys(obj[key]) for key in sorted(obj.keys())}
