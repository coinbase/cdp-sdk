import time

from cdp.api_clients import ApiClients
from cdp.openapi_client.models.evm_eip7702_delegation_status import EvmEip7702DelegationOperation


async def wait_for_evm_eip7702_delegation_operation_status(
    api_clients: ApiClients,
    delegation_operation_id: str,
    timeout_seconds: float = 60,
    interval_seconds: float = 0.2,
) -> EvmEip7702DelegationOperation:
    """Poll the EIP-7702 delegation operation status until it is COMPLETED or FAILED, or a timeout occurs.

    Args:
        api_clients: The API clients object.
        delegation_operation_id (str): The delegation operation ID returned by create_evm_eip7702_delegation.
        timeout_seconds (float, optional): Maximum time to wait in seconds. Defaults to 60.
        interval_seconds (float, optional): Time between checks in seconds. Defaults to 0.2.

    Returns:
        EvmEip7702DelegationOperation: The delegation operation once it reaches a terminal status.

    Raises:
        TimeoutError: If the status doesn't reach a terminal state within the specified timeout.

    """
    start_time = time.time()

    operation = await api_clients.evm_accounts.get_evm_eip7702_delegation_operation_status(
        delegation_operation_id=delegation_operation_id,
    )

    while operation.status not in ("COMPLETED", "FAILED"):
        if time.time() - start_time > timeout_seconds:
            raise TimeoutError("EIP-7702 delegation operation did not reach a terminal status within timeout")

        time.sleep(interval_seconds)

        operation = await api_clients.evm_accounts.get_evm_eip7702_delegation_operation_status(
            delegation_operation_id=delegation_operation_id,
        )

    return operation
