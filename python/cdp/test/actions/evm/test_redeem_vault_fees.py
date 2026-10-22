from unittest.mock import AsyncMock

import pytest

from cdp.actions.evm.redeem_vault_fees import (
    redeem_vault_fees,
    redeem_vault_fees_with_smart_account,
)
from cdp.openapi_client.models.eoa_vault_redeem_fees_request import EoaVaultRedeemFeesRequest
from cdp.openapi_client.models.eoa_vault_redeem_fees_response import EoaVaultRedeemFeesResponse
from cdp.openapi_client.models.smart_account_vault_redeem_fees_request import (
    SmartAccountVaultRedeemFeesRequest,
)
from cdp.openapi_client.models.smart_account_vault_redeem_fees_response import (
    SmartAccountVaultRedeemFeesResponse,
)

ADDRESS = "0x742d35Cc6634C0532925a3b844Bc454e4438f44e"
VAULT_ID = "vault_019f5f10-096a-7a23-86df-f479650d813f"
TX_HASH = "0xf8f98fb6726fc936f24b2007df5cb20e2b8444ff3dfaa2a929335f432a9be2e7"
USER_OP_HASH = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"


@pytest.mark.asyncio
async def test_redeem_vault_fees():
    """Test redeem_vault_fees calls the EVM account endpoint."""
    lend = AsyncMock()
    lend.redeem_vault_fees_with_evm_account = AsyncMock(
        return_value=EoaVaultRedeemFeesResponse(transaction_hash=TX_HASH)
    )

    result = await redeem_vault_fees(
        lend=lend,
        address=ADDRESS,
        vault_id=VAULT_ID,
        max_slippage_bps=50,
        idempotency_key="idem-key",
    )

    lend.redeem_vault_fees_with_evm_account.assert_called_once_with(
        address=ADDRESS,
        eoa_vault_redeem_fees_request=EoaVaultRedeemFeesRequest(
            vault_id=VAULT_ID, max_slippage_bps=50
        ),
        x_idempotency_key="idem-key",
    )
    assert result == TX_HASH


@pytest.mark.asyncio
async def test_redeem_vault_fees_with_smart_account():
    """Test redeem_vault_fees_with_smart_account calls the smart account endpoint."""
    lend = AsyncMock()
    lend.redeem_vault_fees_with_evm_smart_account = AsyncMock(
        return_value=SmartAccountVaultRedeemFeesResponse(user_op_hash=USER_OP_HASH)
    )

    result = await redeem_vault_fees_with_smart_account(
        lend=lend,
        address=ADDRESS,
        vault_id=VAULT_ID,
        paymaster_url="https://paymaster.example.com",
        paymaster_context={"policyId": "policy-123"},
    )

    lend.redeem_vault_fees_with_evm_smart_account.assert_called_once_with(
        address=ADDRESS,
        smart_account_vault_redeem_fees_request=SmartAccountVaultRedeemFeesRequest(
            vault_id=VAULT_ID,
            paymaster_url="https://paymaster.example.com",
            paymaster_context={"policyId": "policy-123"},
        ),
        x_idempotency_key=None,
    )
    assert result == USER_OP_HASH


@pytest.mark.asyncio
async def test_redeem_vault_fees_propagates_errors():
    """Test redeem_vault_fees propagates API errors."""
    lend = AsyncMock()
    lend.redeem_vault_fees_with_evm_account = AsyncMock(side_effect=ValueError("no fee shares"))

    with pytest.raises(ValueError, match="no fee shares"):
        await redeem_vault_fees(lend=lend, address=ADDRESS, vault_id=VAULT_ID)


@pytest.mark.asyncio
async def test_redeem_vault_fees_with_smart_account_propagates_errors():
    """Test redeem_vault_fees_with_smart_account propagates API errors."""
    lend = AsyncMock()
    lend.redeem_vault_fees_with_evm_smart_account = AsyncMock(
        side_effect=ValueError("no fee shares")
    )

    with pytest.raises(ValueError, match="no fee shares"):
        await redeem_vault_fees_with_smart_account(lend=lend, address=ADDRESS, vault_id=VAULT_ID)
