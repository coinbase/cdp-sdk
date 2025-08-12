"""Use a spend permission to spend tokens from a regular account."""

from web3 import Web3

from cdp.actions.evm.send_transaction import send_transaction
from cdp.api_clients import ApiClients
from cdp.evm_transaction_types import TransactionRequestEIP1559
from cdp.spend_permissions import SPEND_PERMISSION_MANAGER_ABI, SPEND_PERMISSION_MANAGER_ADDRESS
from cdp.spend_permissions.types import SpendPermission


async def account_use_spend_permission(
    api_clients: ApiClients,
    address: str,
    spend_permission: SpendPermission,
    value: int,
    network: str,
) -> str:
    """Use a spend permission to spend tokens.

    Args:
        api_clients (ApiClients): The API client to use.
        address (str): The address of the account to use the spend permission on.
        spend_permission (SpendPermission): The spend permission to use.
        value (int): The amount to spend (must be <= allowance).
        network (str): The network to execute the transaction on.

    Returns:
        Hash: The transaction hash of the spend permission.

    """
    # Use the spend permission directly
    resolved_permission = spend_permission

    # Encode the function call data using web3.py
    w3 = Web3()
    contract = w3.eth.contract(
        address=SPEND_PERMISSION_MANAGER_ADDRESS, abi=SPEND_PERMISSION_MANAGER_ABI
    )

    # Convert SpendPermission to a tuple matching the contract's struct
    # Ensure all numeric values are integers (API may return strings)
    # Convert addresses to checksum format for Web3.py compatibility
    permission_tuple = (
        Web3.to_checksum_address(resolved_permission.account),
        Web3.to_checksum_address(resolved_permission.spender),
        Web3.to_checksum_address(resolved_permission.token),
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

    # Create transaction as a DynamicFeeTransaction
    transaction = TransactionRequestEIP1559(
        to=Web3.to_checksum_address(SPEND_PERMISSION_MANAGER_ADDRESS),
        data=encoded_data,
    )

    return await send_transaction(
        evm_accounts=api_clients.evm_accounts,
        address=address,
        transaction=transaction,
        network=network,
    )
