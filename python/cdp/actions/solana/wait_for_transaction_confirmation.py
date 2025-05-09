from cdp.actions.solana.types import (
    WaitForTransactionConfirmationOptions,
    WaitForTransactionConfirmationResult,
)
from cdp.actions.solana.utils import get_or_create_connection


async def wait_for_transaction_confirmation(
    options: WaitForTransactionConfirmationOptions,
) -> WaitForTransactionConfirmationResult:
    """Wait for a transaction to be confirmed.

    Args:
        options: The options for waiting for a transaction to be confirmed

    Returns:
        The result of waiting for a transaction to be confirmed

    """
    connection = get_or_create_connection(options.network)

    blockhash, last_valid_block_height = await connection.get_latest_blockhash()

    confirmation = await connection.confirm_transaction(
        {
            "signature": options.signature,
            "blockhash": blockhash,
            "last_valid_block_height": last_valid_block_height,
        }
    )

    if confirmation.value.err:
        raise Exception(f"Transaction failed: {confirmation.value.err.toString()}")

    return {"signature": options.signature}
