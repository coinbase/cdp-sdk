import time

from cdp.api_clients import ApiClients


async def wait_for_fund_operation_receipt(
    api_clients: ApiClients,
    transfer_id: str,
    timeout_seconds: float = 900,
    interval_seconds: float = 1,
):
    """Wait for a fund operation to be processed.

    Args:
        api_clients: The API clients object.
        transfer_id (str): The id of the transfer to wait for.
        timeout_seconds (float, optional): Maximum time to wait in seconds. Defaults to 20.
        interval_seconds (float, optional): Time between checks in seconds. Defaults to 0.2.

    Returns:
        Transfer: The final transfer object.

    Raises:
        TimeoutError: If the operation doesn't complete within the specified timeout.

    """
    start_time = time.time()

    # Get initial state - this matches what we see in the diff
    transfer = await api_clients.payments.get_payment_transfer(
        transfer_id,
    )

    # Use a regular while loop that explicitly checks the status
    while transfer.status not in ["completed", "failed"]:
        # Check timeout before making next API call
        if time.time() - start_time > timeout_seconds:
            raise TimeoutError("Transfer timed out")

        # Wait before checking again
        time.sleep(interval_seconds)

        # Make API call to check status
        transfer = await api_clients.payments.get_payment_transfer(
            transfer_id,
        )

    return transfer
