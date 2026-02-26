"""Convert an EVM server account to a delegated smart account view after EIP-7702 delegation."""

from cdp.api_clients import ApiClients
from cdp.evm_server_account import EvmServerAccount
from cdp.evm_smart_account import EvmSmartAccount


def to_evm_delegated_account(
    api_clients: ApiClients,
    account: EvmServerAccount,
) -> EvmSmartAccount:
    """Create a smart account view of a server account for use after EIP-7702 delegation.

    The returned account has the same address as the EOA and uses the server account as
    owner, so you can call send_user_operation, wait_for_user_operation, etc.

    Args:
        api_clients: The API clients.
        account: The server account (EOA) that has been delegated via EIP-7702.

    Returns:
        EvmSmartAccount: A smart account view ready for user operation submission.

    Example:
        >>> result = await cdp.evm.create_evm_eip7702_delegation(
        ...     account.address, network="base-sepolia"
        ... )
        >>> w3.eth.wait_for_transaction_receipt(result.transaction_hash)
        >>> delegated = cdp.evm.to_delegated_account(account)
        >>> user_op = await delegated.send_user_operation(
        ...     calls=[EncodedCall(to="0x000...000", value=0, data="0x")],
        ...     network="base-sepolia",
        ... )

    """
    return EvmSmartAccount(
        address=account.address,
        owner=account,
        name=account.name,
        policies=account.policies,
        api_clients=api_clients,
    )


def to_delegated_account(
    api_clients_or_account: ApiClients | EvmServerAccount,
    account: EvmServerAccount | None = None,
) -> EvmSmartAccount:
    """Create a smart account view of a server account for use after EIP-7702 delegation.

    Parity with TypeScript's toDelegatedAccount. Call with either:
    - to_delegated_account(account)  — uses api_clients from the account
    - to_delegated_account(api_clients, account)

    Args:
        api_clients_or_account: Either the API clients or the server account (when account is None).
        account: The server account (EOA) that has been delegated. Omit when first arg is the account.

    Returns:
        EvmSmartAccount: A smart account view ready for user operation submission.
    """
    if account is None:
        acc = api_clients_or_account
        if not isinstance(acc, EvmServerAccount):
            raise TypeError(
                "to_delegated_account(account) requires an EvmServerAccount; "
                "or use to_delegated_account(api_clients, account)."
            )
        return to_evm_delegated_account(acc.api_clients, acc)
    return to_evm_delegated_account(api_clients_or_account, account)
