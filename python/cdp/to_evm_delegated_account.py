"""Convert an EVM server account to a delegated smart account view after EIP-7702 delegation."""

from cdp.evm_server_account import EvmServerAccount
from cdp.evm_smart_account import EvmSmartAccount


def to_evm_delegated_account(account: EvmServerAccount) -> EvmSmartAccount:
    """Create a smart account view of a server account for use after EIP-7702 delegation.

    Uses the API clients from the account (same as those configured by your CdpClient).

    The returned account has the same address as the EOA and uses the server account as
    owner, so you can call send_user_operation, wait_for_user_operation, etc.

    Args:
        account: The server account (EOA) that has been delegated via EIP-7702.

    Returns:
        EvmSmartAccount: A smart account view ready for user operation submission.

    Example:
        >>> result = await cdp.evm.create_evm_eip7702_delegation(
        ...     account.address, network="base-sepolia"
        ... )
        >>> w3.eth.wait_for_transaction_receipt(result.transaction_hash)
        >>> delegated = to_evm_delegated_account(account)
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
        api_clients=account.api_clients,
    )
