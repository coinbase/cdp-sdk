"""Use a spend permission to spend tokens from a smart account."""

from cdp.actions.evm.send_user_operation import send_user_operation
from cdp.api_clients import ApiClients
from cdp.evm_call_types import EncodedCall
from cdp.evm_smart_account import EvmSmartAccount
from cdp.openapi_client.models.evm_user_operation import EvmUserOperation
from cdp.spend_permissions import build_spend_call
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

    Dispatches automatically to either `SpendPermissionManager.spend` (legacy permissions)
    or `SpendRouter.spendAndRoute` (CDP-created permissions whose onchain spender is the
    SpendRouter contract). See cdp.spend_permissions.utils.build_spend_call for the dispatch
    rule.

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
    to, encoded_data = build_spend_call(spend_permission, value)

    call = EncodedCall(to=to, data=encoded_data, value=0)

    return await send_user_operation(
        api_clients=api_clients,
        address=smart_account.address,
        owner=smart_account.owners[0],
        calls=[call],
        network=network,
        paymaster_url=paymaster_url,
    )
