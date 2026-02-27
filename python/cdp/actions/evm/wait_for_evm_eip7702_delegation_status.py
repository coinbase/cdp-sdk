import time

from cdp.api_clients import ApiClients
from cdp.openapi_client.models.evm_eip7702_delegation_network import EvmEip7702DelegationNetwork
from cdp.openapi_client.models.evm_eip7702_delegation_status import EvmEip7702DelegationStatus


async def wait_for_evm_eip7702_delegation_status(
    api_clients: ApiClients,
    address: str,
    network: str | EvmEip7702DelegationNetwork,
    timeout_seconds: float = 60,
    interval_seconds: float = 0.2,
) -> EvmEip7702DelegationStatus:
    """Poll the EIP-7702 delegation status until it is CURRENT or a timeout occurs.

    Args:
        api_clients: The API clients object.
        address (str): The 0x-prefixed address of the EVM account.
        network (str | EvmEip7702DelegationNetwork): The network to query the delegation status on.
        timeout_seconds (float, optional): Maximum time to wait in seconds. Defaults to 60.
        interval_seconds (float, optional): Time between checks in seconds. Defaults to 0.2.

    Returns:
        EvmEip7702DelegationStatus: The delegation status once it reaches CURRENT.

    Raises:
        TimeoutError: If the status doesn't reach CURRENT within the specified timeout.

    """
    start_time = time.time()

    delegation_status = await api_clients.evm_accounts.get_evm_eip7702_delegation_status(
        address=address,
        network=network,
    )

    while delegation_status.status != "CURRENT":
        if time.time() - start_time > timeout_seconds:
            raise TimeoutError("EIP-7702 delegation status did not reach CURRENT within timeout")

        time.sleep(interval_seconds)

        delegation_status = await api_clients.evm_accounts.get_evm_eip7702_delegation_status(
            address=address,
            network=network,
        )

    return delegation_status
