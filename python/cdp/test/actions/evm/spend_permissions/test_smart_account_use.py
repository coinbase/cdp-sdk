"""Tests for smart_account_use_spend_permission function."""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from cdp.actions.evm.spend_permissions.smart_account_use import smart_account_use_spend_permission
from cdp.evm_smart_account import EvmSmartAccount
from cdp.spend_permissions import (
    SPEND_PERMISSION_MANAGER_ADDRESS,
    SPEND_ROUTER_ADDRESS,
    SpendPermission,
)

# Sentinel calldata distinct enough to round-trip through the handler unambiguously and
# verify it ends up on the outgoing user-op call.
_LEGACY_CALLDATA = "0x33211c30deadbeef"
_ROUTED_CALLDATA = "0x12345678cafebabe"


def _make_permission(spender: str) -> SpendPermission:
    return SpendPermission(
        account="0x3333333333333333333333333333333333333333",
        spender=spender,
        token="0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
        allowance=1000000000000000000,
        period=86400,
        start=1700000000,
        end=1700086400,
        salt=12345,
        extra_data="0x",
    )


def _make_smart_account() -> EvmSmartAccount:
    return EvmSmartAccount(
        address="0x3333333333333333333333333333333333333333",
        owner=MagicMock(),
        name="test-account",
    )


@pytest.mark.asyncio
@patch("cdp.actions.evm.spend_permissions.smart_account_use.send_user_operation")
@patch("cdp.actions.evm.spend_permissions.smart_account_use.build_spend_call")
async def test_smart_account_use_spend_permission_legacy(
    mock_build_spend_call, mock_send_user_operation
):
    """Legacy permission spender targets SpendPermissionManager in the user-op call."""
    mock_build_spend_call.return_value = (SPEND_PERMISSION_MANAGER_ADDRESS, _LEGACY_CALLDATA)
    mock_user_operation = MagicMock()
    mock_send_user_operation.return_value = mock_user_operation

    permission = _make_permission(spender="0x5555555555555555555555555555555555555555")
    smart_account = _make_smart_account()

    result = await smart_account_use_spend_permission(
        api_clients=AsyncMock(),
        smart_account=smart_account,
        spend_permission=permission,
        value=500000000000000000,
        network="base-sepolia",
        paymaster_url="https://paymaster.example.com",
    )

    assert result is mock_user_operation
    mock_build_spend_call.assert_called_once_with(permission, 500000000000000000)
    call_args = mock_send_user_operation.call_args
    assert len(call_args.kwargs["calls"]) == 1
    assert call_args.kwargs["calls"][0].to == SPEND_PERMISSION_MANAGER_ADDRESS
    assert call_args.kwargs["calls"][0].data == _LEGACY_CALLDATA
    assert call_args.kwargs["calls"][0].value == 0
    assert call_args.kwargs["network"] == "base-sepolia"
    assert call_args.kwargs["paymaster_url"] == "https://paymaster.example.com"


@pytest.mark.asyncio
@patch("cdp.actions.evm.spend_permissions.smart_account_use.send_user_operation")
@patch("cdp.actions.evm.spend_permissions.smart_account_use.build_spend_call")
async def test_smart_account_use_spend_permission_routed(
    mock_build_spend_call, mock_send_user_operation
):
    """SpendRouter spender targets the SpendRouter contract in the user-op call."""
    mock_build_spend_call.return_value = (SPEND_ROUTER_ADDRESS, _ROUTED_CALLDATA)
    mock_user_operation = MagicMock()
    mock_send_user_operation.return_value = mock_user_operation

    permission = _make_permission(spender=SPEND_ROUTER_ADDRESS)
    smart_account = _make_smart_account()

    result = await smart_account_use_spend_permission(
        api_clients=AsyncMock(),
        smart_account=smart_account,
        spend_permission=permission,
        value=500000000000000000,
        network="base-sepolia",
    )

    assert result is mock_user_operation
    mock_build_spend_call.assert_called_once_with(permission, 500000000000000000)
    call_args = mock_send_user_operation.call_args
    assert call_args.kwargs["calls"][0].to == SPEND_ROUTER_ADDRESS
    assert call_args.kwargs["calls"][0].data == _ROUTED_CALLDATA
