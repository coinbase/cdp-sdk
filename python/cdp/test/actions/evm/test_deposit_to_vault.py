from unittest.mock import AsyncMock

import pytest

from cdp.actions.evm.deposit_to_vault import (
    deposit_to_vault,
    deposit_to_vault_with_smart_account,
)
from cdp.openapi_client.models.deposit_to_vault_with_evm_account_request import (
    DepositToVaultWithEvmAccountRequest,
)
from cdp.openapi_client.models.deposit_to_vault_with_evm_smart_account_request import (
    DepositToVaultWithEvmSmartAccountRequest,
)
from cdp.openapi_client.models.eoa_vault_deposit_response import EoaVaultDepositResponse
from cdp.openapi_client.models.smart_account_vault_deposit_response import (
    SmartAccountVaultDepositResponse,
)

ADDRESS = "0x742d35Cc6634C0532925a3b844Bc454e4438f44e"
RECEIVER = "0x1234567890123456789012345678901234567890"
VAULT_ID = "vault_019f5f10-096a-7a23-86df-f479650d813f"
AMOUNT = "25.50"
TX_HASH = "0xf8f98fb6726fc936f24b2007df5cb20e2b8444ff3dfaa2a929335f432a9be2e7"
USER_OP_HASH = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"


@pytest.mark.asyncio
async def test_deposit_to_vault():
    """Test deposit_to_vault calls the EVM account endpoint."""
    lend = AsyncMock()
    lend.deposit_to_vault_with_evm_account = AsyncMock(
        return_value=EoaVaultDepositResponse(transaction_hash=TX_HASH)
    )

    result = await deposit_to_vault(
        lend=lend,
        address=ADDRESS,
        vault_id=VAULT_ID,
        amount=AMOUNT,
        receiver=RECEIVER,
        max_slippage_bps=50,
        idempotency_key="idem-key",
    )

    lend.deposit_to_vault_with_evm_account.assert_called_once_with(
        address=ADDRESS,
        deposit_to_vault_with_evm_account_request=DepositToVaultWithEvmAccountRequest(
            vault_id=VAULT_ID, amount=AMOUNT, receiver=RECEIVER, max_slippage_bps=50
        ),
        x_idempotency_key="idem-key",
    )
    assert result == TX_HASH


@pytest.mark.asyncio
async def test_deposit_to_vault_omits_optional_fields():
    """Test deposit_to_vault leaves optional fields unset."""
    lend = AsyncMock()
    lend.deposit_to_vault_with_evm_account = AsyncMock(
        return_value=EoaVaultDepositResponse(transaction_hash=TX_HASH)
    )

    await deposit_to_vault(lend=lend, address=ADDRESS, vault_id=VAULT_ID, amount=AMOUNT)

    lend.deposit_to_vault_with_evm_account.assert_called_once_with(
        address=ADDRESS,
        deposit_to_vault_with_evm_account_request=DepositToVaultWithEvmAccountRequest(
            vault_id=VAULT_ID, amount=AMOUNT
        ),
        x_idempotency_key=None,
    )


@pytest.mark.asyncio
async def test_deposit_to_vault_with_smart_account():
    """Test deposit_to_vault_with_smart_account calls the EVM smart account endpoint."""
    lend = AsyncMock()
    lend.deposit_to_vault_with_evm_smart_account = AsyncMock(
        return_value=SmartAccountVaultDepositResponse(user_op_hash=USER_OP_HASH)
    )
    paymaster_context = {"policyId": "policy-123"}

    result = await deposit_to_vault_with_smart_account(
        lend=lend,
        address=ADDRESS,
        vault_id=VAULT_ID,
        amount=AMOUNT,
        receiver=RECEIVER,
        paymaster_url="https://paymaster.example.com",
        paymaster_context=paymaster_context,
        idempotency_key="idem-key",
    )

    lend.deposit_to_vault_with_evm_smart_account.assert_called_once_with(
        address=ADDRESS,
        deposit_to_vault_with_evm_smart_account_request=DepositToVaultWithEvmSmartAccountRequest(
            vault_id=VAULT_ID,
            amount=AMOUNT,
            receiver=RECEIVER,
            paymaster_url="https://paymaster.example.com",
            paymaster_context=paymaster_context,
        ),
        x_idempotency_key="idem-key",
    )
    assert result == USER_OP_HASH


@pytest.mark.asyncio
async def test_deposit_to_vault_propagates_api_errors():
    """Test deposit_to_vault propagates API errors."""
    lend = AsyncMock()
    error = Exception("Vault not found.")
    lend.deposit_to_vault_with_evm_account = AsyncMock(side_effect=error)

    with pytest.raises(Exception) as exc_info:
        await deposit_to_vault(lend=lend, address=ADDRESS, vault_id=VAULT_ID, amount=AMOUNT)

    assert exc_info.value is error
