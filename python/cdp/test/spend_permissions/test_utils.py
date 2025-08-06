"""Tests for spend_permissions.utils module."""

from datetime import datetime
from unittest.mock import patch

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


def test_resolve_spend_permission_with_period():
    """Test resolving spend permission input with period in seconds."""
    with patch("cdp.spend_permissions.utils.datetime") as mock_datetime:
        # Mock current time to a fixed value
        mock_now = datetime(2024, 1, 1, 0, 0, 0)
        mock_datetime.now.return_value = mock_now

        spend_permission_input = SpendPermissionInput(
            account="0x1234567890123456789012345678901234567890",
            spender="0x0987654321098765432109876543210987654321",
            token="usdc",
            allowance=1000000,  # 1 USDC (6 decimals)
            period=86400,  # 1 day in seconds
        )

        resolved = resolve_spend_permission(spend_permission_input, "base")

        assert resolved.account == spend_permission_input.account
        assert resolved.spender == spend_permission_input.spender
        assert resolved.token == "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"  # USDC on Base
        assert resolved.allowance == spend_permission_input.allowance
        assert resolved.period == 86400
        assert resolved.start == int(mock_now.timestamp())  # Current time
        assert resolved.end == 281474976710655  # Max uint48 value
        assert resolved.salt > 0  # Random salt
        assert resolved.extra_data == "0x"  # Default value


def test_resolve_spend_permission_with_period_in_days():
    """Test resolving spend permission input with period_in_days."""
    with patch("cdp.spend_permissions.utils.datetime") as mock_datetime:
        # Mock current time to a fixed value
        mock_now = datetime(2024, 1, 1, 0, 0, 0)
        mock_datetime.now.return_value = mock_now

        spend_permission_input = SpendPermissionInput(
            account="0x1234567890123456789012345678901234567890",
            spender="0x0987654321098765432109876543210987654321",
            token="eth",
            allowance=1000000000000000000,  # 1 ETH
            period_in_days=7,  # 1 week
        )

        resolved = resolve_spend_permission(spend_permission_input, "ethereum")

        assert resolved.account == spend_permission_input.account
        assert resolved.spender == spend_permission_input.spender
        assert resolved.token == "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"  # ETH
        assert resolved.allowance == spend_permission_input.allowance
        assert resolved.period == 7 * 24 * 60 * 60  # 7 days in seconds
        assert resolved.start == int(mock_now.timestamp())  # Current time
        assert resolved.end == 281474976710655  # Max uint48 value
        assert resolved.salt > 0  # Random salt
        assert resolved.extra_data == "0x"  # Default value


def test_resolve_spend_permission_with_datetime_objects():
    """Test resolving spend permission input with custom datetime objects."""
    start_time = datetime(2024, 1, 15, 10, 30, 0)
    end_time = datetime(2024, 12, 31, 23, 59, 59)

    spend_permission_input = SpendPermissionInput(
        account="0x1234567890123456789012345678901234567890",
        spender="0x0987654321098765432109876543210987654321",
        token="0xCustomToken123",
        allowance=1000000,
        period=86400,
        start=start_time,
        end=end_time,
        salt=42,
        extra_data="0x1234",
    )

    resolved = resolve_spend_permission(spend_permission_input, "base")

    assert resolved.token == "0xCustomToken123"  # Custom token unchanged
    assert resolved.start == int(start_time.timestamp())
    assert resolved.end == int(end_time.timestamp())
    assert resolved.salt == 42  # Custom salt
    assert resolved.extra_data == "0x1234"  # Custom extra_data


def test_resolve_spend_permission_validation_errors():
    """Test validation errors for invalid input combinations."""
    # Test both period and period_in_days provided
    with pytest.raises(
        UserInputValidationError,
        match="Cannot specify both 'period' and 'period_in_days'. Please provide only one.",
    ):
        spend_permission_input = SpendPermissionInput(
            account="0x1234567890123456789012345678901234567890",
            spender="0x0987654321098765432109876543210987654321",
            token="eth",
            allowance=1000000000000000000,
            period=86400,
            period_in_days=1,
        )
        resolve_spend_permission(spend_permission_input, "ethereum")

    # Test neither period nor period_in_days provided
    with pytest.raises(
        UserInputValidationError,
        match="Must specify either 'period' \\(in seconds\\) or 'period_in_days'.",
    ):
        spend_permission_input = SpendPermissionInput(
            account="0x1234567890123456789012345678901234567890",
            spender="0x0987654321098765432109876543210987654321",
            token="eth",
            allowance=1000000000000000000,
        )
        resolve_spend_permission(spend_permission_input, "ethereum")
