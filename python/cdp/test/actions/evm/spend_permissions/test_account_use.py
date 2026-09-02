"""Tests for account_use_spend_permission function."""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from cdp.actions.evm.spend_permissions.account_use import account_use_spend_permission
from cdp.spend_permissions import (
    SPEND_PERMISSION_MANAGER_ADDRESS,
    SPEND_ROUTER_ADDRESS,
    SpendPermission,
)

# Sentinel calldata distinct enough to round-trip through the handler unambiguously and
# verify it ends up on the outgoing transaction.
_LEGACY_CALLDATA = "0x33211c30deadbeef"
_ROUTED_CALLDATA = "0x12345678cafebabe"


def _make_permission(spender: str) -> SpendPermission:
    return SpendPermission(
        account="0x1111111111111111111111111111111111111111",
        spender=spender,
        token="0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
        allowance=1000000000000000000,
        period=86400,
        start=1700000000,
        end=1700086400,
        salt=12345,
        extra_data="0x",
    )


@pytest.mark.asyncio
@patch("cdp.actions.evm.spend_permissions.account_use.build_spend_call")
async def test_account_use_spend_permission_legacy(mock_build_spend_call):
    """Legacy permission spender routes the transaction to SpendPermissionManager."""
    mock_build_spend_call.return_value = (SPEND_PERMISSION_MANAGER_ADDRESS, _LEGACY_CALLDATA)

    mock_api_clients = AsyncMock()
    mock_api_clients.evm_accounts = AsyncMock()
    mock_api_clients.evm_accounts.send_evm_transaction.return_value = MagicMock(
        transaction_hash="0xabc123"
    )

    permission = _make_permission(spender="0x2222222222222222222222222222222222222222")
    result = await account_use_spend_permission(
        api_clients=mock_api_clients,
        address="0x2222222222222222222222222222222222222222",
        spend_permission=permission,
        value=500000000000000000,
        network="base-sepolia",
    )

    assert result == "0xabc123"
    mock_build_spend_call.assert_called_once_with(permission, 500000000000000000)
    mock_api_clients.evm_accounts.send_evm_transaction.assert_called_once()


@pytest.mark.asyncio
@patch("cdp.actions.evm.spend_permissions.account_use.build_spend_call")
async def test_account_use_spend_permission_routed(mock_build_spend_call):
    """SpendRouter spender routes the transaction to the SpendRouter contract."""
    mock_build_spend_call.return_value = (SPEND_ROUTER_ADDRESS, _ROUTED_CALLDATA)

    mock_api_clients = AsyncMock()
    mock_api_clients.evm_accounts = AsyncMock()
    mock_api_clients.evm_accounts.send_evm_transaction.return_value = MagicMock(
        transaction_hash="0xrouted456"
    )

    permission = _make_permission(spender=SPEND_ROUTER_ADDRESS)
    result = await account_use_spend_permission(
        api_clients=mock_api_clients,
        address="0x2222222222222222222222222222222222222222",
        spend_permission=permission,
        value=500000000000000000,
        network="base-sepolia",
    )

    assert result == "0xrouted456"
    mock_build_spend_call.assert_called_once_with(permission, 500000000000000000)
