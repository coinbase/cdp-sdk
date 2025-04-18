import time

from cdp.api_clients import ApiClients


async def wait_for_user_operation(
    api_clients: ApiClients,
    smart_account_address: str,
    user_op_hash: str,
    timeout_seconds: float = 20,
    interval_seconds: float = 0.2,
):
    """Wait for a user operation to be processed.

    Args:
        api_clients: The API clients object.
        smart_account_address (str): The address of the smart account that sent the operation.
        user_op_hash (str): The hash of the user operation to wait for.
        timeout_seconds (float, optional): Maximum time to wait in seconds. Defaults to 20.
        interval_seconds (float, optional): Time between checks in seconds. Defaults to 0.2.

    Returns:
        EvmUserOperation: The final user operation object.

    Raises:
        TimeoutError: If the operation doesn't complete within the specified timeout.

    """
    start_time = time.time()

    # Get initial state - this matches what we see in the diff
    user_operation = await api_clients.evm_smart_accounts.get_user_operation(
        smart_account_address,
        user_op_hash,
    )

    # Use a regular while loop that explicitly checks the status
    while user_operation.status not in ["complete", "failed"]:
        # Check timeout before making next API call
        if time.time() - start_time > timeout_seconds:
            raise TimeoutError("User Operation timed out")

        # Wait before checking again
        time.sleep(interval_seconds)

        # Make API call to check status
        user_operation = await api_clients.evm_smart_accounts.get_user_operation(
            smart_account_address,
            user_op_hash,
        )

    return user_operation
