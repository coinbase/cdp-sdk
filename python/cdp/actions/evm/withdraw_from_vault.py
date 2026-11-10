from typing import Any

from cdp.openapi_client.api.lend_api import LendApi
from cdp.openapi_client.models.withdraw_from_vault_with_evm_account_request import (
    WithdrawFromVaultWithEvmAccountRequest,
)
from cdp.openapi_client.models.withdraw_from_vault_with_evm_smart_account_request import (
    WithdrawFromVaultWithEvmSmartAccountRequest,
)


async def withdraw_from_vault(
    lend: LendApi,
    address: str,
    vault_id: str,
    amount: str | None = None,
    withdraw_all: bool | None = None,
    receiver: str | None = None,
    max_slippage_bps: int | None = None,
    idempotency_key: str | None = None,
) -> str:
    """Withdraw a vault's underlying asset from an EVM account's position in the vault.

    Provide either `amount` or `withdraw_all=True`.

    Args:
        lend (LendApi): The Lend API.
        address (str): The address of the EVM account to withdraw from.
        vault_id (str): The ID of the vault to withdraw from.
        amount (str, optional): The amount to withdraw, as a decimal string in the asset's
            standard unit, e.g. "25.50" for 25.50 USDC. Cannot be combined with
            `withdraw_all=True`.
        withdraw_all (bool, optional): Whether to withdraw the entire position by redeeming every
            vault share the account holds.
        receiver (str, optional): The address that receives the withdrawn asset. Defaults to the
            withdrawing account.
        max_slippage_bps (int, optional): The maximum share-price slippage in basis points.
            Defaults to 100 bps (1%) when omitted.
        idempotency_key (str, optional): The idempotency key. Defaults to None.

    Returns:
        str: The hash of the broadcast withdrawal transaction.

    """
    response = await lend.withdraw_from_vault_with_evm_account(
        address=address,
        withdraw_from_vault_with_evm_account_request=WithdrawFromVaultWithEvmAccountRequest(
            vault_id=vault_id,
            amount=amount,
            withdraw_all=withdraw_all,
            receiver=receiver,
            max_slippage_bps=max_slippage_bps,
        ),
        x_idempotency_key=idempotency_key,
    )
    return response.transaction_hash


async def withdraw_from_vault_with_smart_account(
    lend: LendApi,
    address: str,
    vault_id: str,
    amount: str | None = None,
    withdraw_all: bool | None = None,
    receiver: str | None = None,
    max_slippage_bps: int | None = None,
    use_cdp_paymaster: bool | None = None,
    paymaster_url: str | None = None,
    paymaster_context: dict[str, Any] | None = None,
    idempotency_key: str | None = None,
) -> str:
    """Withdraw a vault's underlying asset from an EVM smart account's position in the vault.

    The smart account's owner must be a CDP EVM account. Provide either `amount` or
    `withdraw_all=True`.

    Args:
        lend (LendApi): The Lend API.
        address (str): The address of the EVM smart account to withdraw from.
        vault_id (str): The ID of the vault to withdraw from.
        amount (str, optional): The amount to withdraw, as a decimal string in the asset's
            standard unit, e.g. "25.50" for 25.50 USDC. Cannot be combined with
            `withdraw_all=True`.
        withdraw_all (bool, optional): Whether to withdraw the entire position by redeeming every
            vault share the smart account holds.
        receiver (str, optional): The address that receives the withdrawn asset. Defaults to the
            withdrawing smart account.
        max_slippage_bps (int, optional): The maximum share-price slippage in basis points.
            Defaults to 100 bps (1%) when omitted.
        use_cdp_paymaster (bool, optional): Whether to sponsor gas with the CDP Paymaster.
            Only supported on Base and Base Sepolia. Cannot be combined with `paymaster_url`.
        paymaster_url (str, optional): A custom Paymaster URL. Cannot be combined with
            `use_cdp_paymaster`.
        paymaster_context (dict[str, Any], optional): The ERC-7677 paymaster context. Requires
            a paymaster.
        idempotency_key (str, optional): The idempotency key. Defaults to None.

    Returns:
        str: The hash of the broadcast user operation.

    """
    response = await lend.withdraw_from_vault_with_evm_smart_account(
        address=address,
        withdraw_from_vault_with_evm_smart_account_request=WithdrawFromVaultWithEvmSmartAccountRequest(
            vault_id=vault_id,
            amount=amount,
            withdraw_all=withdraw_all,
            receiver=receiver,
            max_slippage_bps=max_slippage_bps,
            use_cdp_paymaster=use_cdp_paymaster,
            paymaster_url=paymaster_url,
            paymaster_context=paymaster_context,
        ),
        x_idempotency_key=idempotency_key,
    )
    return response.user_op_hash
