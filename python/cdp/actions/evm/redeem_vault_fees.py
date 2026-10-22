from typing import Any

from cdp.openapi_client.api.lend_api import LendApi
from cdp.openapi_client.models.eoa_vault_redeem_fees_request import EoaVaultRedeemFeesRequest
from cdp.openapi_client.models.smart_account_vault_redeem_fees_request import (
    SmartAccountVaultRedeemFeesRequest,
)


async def redeem_vault_fees(
    lend: LendApi,
    address: str,
    vault_id: str,
    max_slippage_bps: int | None = None,
    idempotency_key: str | None = None,
) -> str:
    """Redeem every vault share held by a vault's fee recipient EVM account.

    Args:
        lend (LendApi): The Lend API.
        address (str): The address of the EVM account that is the vault's fee recipient.
        vault_id (str): The ID of the vault to redeem fees from.
        max_slippage_bps (int, optional): The maximum share-price slippage in basis points.
            Defaults to 100 bps (1%) when omitted.
        idempotency_key (str, optional): The idempotency key. Defaults to None.

    Returns:
        str: The hash of the broadcast redemption transaction.

    """
    response = await lend.redeem_vault_fees_with_evm_account(
        address=address,
        eoa_vault_redeem_fees_request=EoaVaultRedeemFeesRequest(
            vault_id=vault_id,
            max_slippage_bps=max_slippage_bps,
        ),
        x_idempotency_key=idempotency_key,
    )
    return response.transaction_hash


async def redeem_vault_fees_with_smart_account(
    lend: LendApi,
    address: str,
    vault_id: str,
    max_slippage_bps: int | None = None,
    use_cdp_paymaster: bool | None = None,
    paymaster_url: str | None = None,
    paymaster_context: dict[str, Any] | None = None,
    idempotency_key: str | None = None,
) -> str:
    """Redeem every vault share held by a vault's fee recipient EVM smart account.

    The smart account's owner must be a CDP EVM account.

    Args:
        lend (LendApi): The Lend API.
        address (str): The address of the EVM smart account that is the vault's fee recipient.
        vault_id (str): The ID of the vault to redeem fees from.
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
    response = await lend.redeem_vault_fees_with_evm_smart_account(
        address=address,
        smart_account_vault_redeem_fees_request=SmartAccountVaultRedeemFeesRequest(
            vault_id=vault_id,
            max_slippage_bps=max_slippage_bps,
            use_cdp_paymaster=use_cdp_paymaster,
            paymaster_url=paymaster_url,
            paymaster_context=paymaster_context,
        ),
        x_idempotency_key=idempotency_key,
    )
    return response.user_op_hash
