"""Use a spend permission to spend tokens from a regular account."""

from cdp.actions.evm.send_transaction import send_transaction
from cdp.api_clients import ApiClients
from cdp.evm_transaction_types import TransactionRequestEIP1559
from cdp.spend_permissions import build_spend_call
from cdp.spend_permissions.types import SpendPermission


async def account_use_spend_permission(
    api_clients: ApiClients,
    address: str,
    spend_permission: SpendPermission,
    value: int,
    network: str,
) -> str:
    """Use a spend permission to spend tokens.

    Dispatches automatically to either `SpendPermissionManager.spend` (legacy permissions)
    or `SpendRouter.spendAndRoute` (CDP-created permissions whose onchain spender is the
    SpendRouter contract). See cdp.spend_permissions.utils.build_spend_call for the dispatch
    rule.

    Args:
        api_clients (ApiClients): The API client to use.
        address (str): The address of the account to use the spend permission on.
        spend_permission (SpendPermission): The spend permission to use.
        value (int): The amount to spend (must be <= allowance).
        network (str): The network to execute the transaction on.

    Returns:
        Hash: The transaction hash of the spend permission.

    """
    to, encoded_data = build_spend_call(spend_permission, value)

    transaction = TransactionRequestEIP1559(to=to, data=encoded_data)

    return await send_transaction(
        evm_accounts=api_clients.evm_accounts,
        address=address,
        transaction=transaction,
        network=network,
    )
