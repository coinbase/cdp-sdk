from typing import Any

from cdp.openapi_client.api.lend_api import LendApi
from cdp.openapi_client.models.deposit_to_vault_with_evm_account_request import (
    DepositToVaultWithEvmAccountRequest,
)
from cdp.openapi_client.models.deposit_to_vault_with_evm_smart_account_request import (
    DepositToVaultWithEvmSmartAccountRequest,
)


async def deposit_to_vault(
    lend: LendApi,
    address: str,
    vault_id: str,
    amount: str,
    receiver: str | None = None,
    max_slippage_bps: int | None = None,
    idempotency_key: str | None = None,
) -> str:
    """Deposit a vault's underlying asset from an EVM account into the vault.

    Args:
        lend (LendApi): The Lend API.
        address (str): The address of the EVM account to deposit from.
        vault_id (str): The ID of the vault to deposit into.
        amount (str): The amount to deposit, as a decimal string in the asset's standard unit,
            e.g. "25.50" for 25.50 USDC.
        receiver (str, optional): The address that receives the minted vault shares. Defaults
            to the depositing account.
        max_slippage_bps (int, optional): The maximum share-price slippage in basis points.
            Defaults to 100 bps (1%) when omitted.
        idempotency_key (str, optional): The idempotency key. Defaults to None.

    Returns:
        str: The hash of the broadcast deposit transaction.

    """
    response = await lend.deposit_to_vault_with_evm_account(
        address=address,
        deposit_to_vault_with_evm_account_request=DepositToVaultWithEvmAccountRequest(
            vault_id=vault_id,
            amount=amount,
            receiver=receiver,
            max_slippage_bps=max_slippage_bps,
        ),
        x_idempotency_key=idempotency_key,
    )
    return response.transaction_hash


async def deposit_to_vault_with_smart_account(
    lend: LendApi,
    address: str,
    vault_id: str,
    amount: str,
    receiver: str | None = None,
    use_cdp_paymaster: bool | None = None,
    paymaster_url: str | None = None,
    paymaster_context: dict[str, Any] | None = None,
    idempotency_key: str | None = None,
) -> str:
    """Deposit a vault's underlying asset from an EVM smart account into the vault.

    The smart account's owner must be a CDP EVM account.

    Args:
        lend (LendApi): The Lend API.
        address (str): The address of the EVM smart account to deposit from.
        vault_id (str): The ID of the vault to deposit into.
        amount (str): The amount to deposit, as a decimal string in the asset's standard unit,
            e.g. "25.50" for 25.50 USDC.
        receiver (str, optional): The address that receives the minted vault shares. Defaults
            to the depositing smart account.
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
    response = await lend.deposit_to_vault_with_evm_smart_account(
        address=address,
        deposit_to_vault_with_evm_smart_account_request=DepositToVaultWithEvmSmartAccountRequest(
            vault_id=vault_id,
            amount=amount,
            receiver=receiver,
            use_cdp_paymaster=use_cdp_paymaster,
            paymaster_url=paymaster_url,
            paymaster_context=paymaster_context,
        ),
        x_idempotency_key=idempotency_key,
    )
    return response.user_op_hash
