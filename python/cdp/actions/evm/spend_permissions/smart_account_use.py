"""Use a spend permission to spend tokens from a smart account."""

from web3 import Web3

from cdp.actions.evm.send_user_operation import send_user_operation
from cdp.api_clients import ApiClients
from cdp.evm_call_types import EncodedCall
from cdp.evm_smart_account import EvmSmartAccount
from cdp.openapi_client.models.evm_user_operation import EvmUserOperation
from cdp.spend_permissions import SPEND_PERMISSION_MANAGER_ABI, SPEND_PERMISSION_MANAGER_ADDRESS
from cdp.spend_permissions.types import SpendPermission


async def smart_account_use_spend_permission(
    api_clients: ApiClients,
    smart_account: EvmSmartAccount,
    spend_permission: SpendPermission,
    value: int,
    network: str,
    paymaster_url: str | None = None,
) -> EvmUserOperation:
    """Use a spend permission to spend tokens from a smart account.

    Args:
        api_clients (ApiClients): The API client to use.
        smart_account (EvmSmartAccount): The smart account to use the spend permission on.
        spend_permission (SpendPermission): The spend permission to use.
        value (int): The amount to spend (must be <= allowance).
        network (str): The network to execute the transaction on.
        paymaster_url (str | None): Optional paymaster URL for gas sponsorship.

    Returns:
        EvmUserOperation: The user operation response.

    """
    # Use the spend permission directly
    resolved_permission = spend_permission

    # Encode the function call data using web3.py
    w3 = Web3()
    contract = w3.eth.contract(
        address=w3.to_checksum_address(SPEND_PERMISSION_MANAGER_ADDRESS),
        abi=SPEND_PERMISSION_MANAGER_ABI,
    )

    # Convert SpendPermission to a tuple matching the contract's struct
    # Ensure all numeric values are integers (API may return strings)
    # Convert addresses to checksum format for Web3.py compatibility
    permission_tuple = (
        w3.to_checksum_address(resolved_permission.account),
        w3.to_checksum_address(resolved_permission.spender),
        w3.to_checksum_address(resolved_permission.token),
        int(resolved_permission.allowance),  # Convert to int
        int(resolved_permission.period),  # Convert to int
        int(resolved_permission.start),  # Convert to int
        int(resolved_permission.end),  # Convert to int
        int(resolved_permission.salt),  # Convert to int
        bytes.fromhex(resolved_permission.extra_data[2:])
        if resolved_permission.extra_data.startswith("0x")
        else bytes.fromhex(resolved_permission.extra_data),
    )

    encoded_data = contract.encode_abi("spend", args=[permission_tuple, value])

    # Create the call
    call = EncodedCall(
        to=w3.to_checksum_address(SPEND_PERMISSION_MANAGER_ADDRESS), data=encoded_data, value=0
    )

    # Send the user operation
    return await send_user_operation(
        api_clients=api_clients,
        address=smart_account.address,
        owner=smart_account.owners[0],
        calls=[call],
        network=network,
        paymaster_url=paymaster_url,
    )
