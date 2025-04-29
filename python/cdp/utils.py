import inspect

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
