"""Tests for spend_permissions.utils module."""

import pytest

from cdp.errors import UserInputValidationError
from cdp.spend_permissions.types import SpendPermissionInput
from cdp.spend_permissions.utils import resolve_spend_permission, resolve_token_address


def test_resolve_token_address_eth_ethereum():
    """Test resolving ETH address on Ethereum."""
    address = resolve_token_address("eth", "ethereum")
    assert address == "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"


def test_resolve_token_address_eth_ethereum_sepolia():
    """Test resolving ETH address on Ethereum Sepolia."""
    address = resolve_token_address("eth", "ethereum-sepolia")
    assert address == "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"


def test_resolve_token_address_usdc_base():
    """Test resolving USDC address on Base."""
    address = resolve_token_address("usdc", "base")
    assert address == "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"


def test_resolve_token_address_usdc_base_sepolia():
    """Test resolving USDC address on Base Sepolia."""
    address = resolve_token_address("usdc", "base-sepolia")
    assert address == "0x036CbD53842c5426634e7929541eC2318f3dCF7e"


def test_resolve_token_address_custom_address():
    """Test that custom addresses are returned unchanged."""
    custom_address = "0x1234567890123456789012345678901234567890"
    address = resolve_token_address(custom_address, "ethereum")
    assert address == custom_address


def test_resolve_token_address_unsupported_token_network():
    """Test that unsupported token/network combinations raise errors."""
    with pytest.raises(
        UserInputValidationError,
        match="Automatic token address lookup for usdc is not supported on arbitrum",
    ):
        resolve_token_address("usdc", "arbitrum")


def test_resolve_spend_permission():
    """Test resolving spend permission input to spend permission."""
    spend_permission_input = SpendPermissionInput(
        account="0x1234567890123456789012345678901234567890",
        spender="0x0987654321098765432109876543210987654321",
        token="usdc",
        allowance=1000000,  # 1 USDC (6 decimals)
        period=86400,
        start=0,
        end=281474976710655,
    )

    resolved = resolve_spend_permission(spend_permission_input, "base")

    assert resolved.account == spend_permission_input.account
    assert resolved.spender == spend_permission_input.spender
    assert resolved.token == "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"  # USDC on Base
    assert resolved.allowance == spend_permission_input.allowance
    assert resolved.period == spend_permission_input.period
    assert resolved.start == spend_permission_input.start
    assert resolved.end == spend_permission_input.end
    assert resolved.salt == 0  # Default value
    assert resolved.extra_data == "0x"  # Default value


def test_resolve_spend_permission_with_optional_fields():
    """Test resolving spend permission input with custom salt and extra_data."""
    spend_permission_input = SpendPermissionInput(
        account="0x1234567890123456789012345678901234567890",
        spender="0x0987654321098765432109876543210987654321",
        token="0xCustomToken123",
        allowance=1000000,
        period=86400,
        start=0,
        end=281474976710655,
        salt=42,
        extra_data="0x1234",
    )

    resolved = resolve_spend_permission(spend_permission_input, "base")

    assert resolved.token == "0xCustomToken123"  # Custom token unchanged
    assert resolved.salt == 42  # Custom salt
    assert resolved.extra_data == "0x1234"  # Custom extra_data
