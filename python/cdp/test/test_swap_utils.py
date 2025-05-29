"""Unit tests for swap utility functions."""

import pytest

from cdp.actions.evm.swap.utils import (
    calculate_minimum_amount_out,
    format_amount,
    resolve_token_address,
)


class TestResolveTokenAddress:
    """Test resolve_token_address function."""

    def test_resolve_eth(self):
        """Test resolving ETH token."""
        address = resolve_token_address("eth", "base")
        assert address == "0x0000000000000000000000000000000000000000"

    def test_resolve_eth_case_insensitive(self):
        """Test resolving ETH token with different cases."""
        assert resolve_token_address("ETH", "base") == "0x0000000000000000000000000000000000000000"
        assert resolve_token_address("Eth", "base") == "0x0000000000000000000000000000000000000000"

    def test_resolve_usdc_base(self):
        """Test resolving USDC on Base."""
        address = resolve_token_address("usdc", "base")
        assert address == "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913"

    def test_resolve_usdc_ethereum(self):
        """Test resolving USDC on Ethereum."""
        address = resolve_token_address("USDC", "ethereum")
        assert address == "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48"

    def test_resolve_weth_base(self):
        """Test resolving WETH on Base."""
        address = resolve_token_address("weth", "base")
        assert address == "0x4200000000000000000000000000000000000006"

    def test_resolve_contract_address(self):
        """Test resolving when input is already a contract address."""
        input_address = "0x1234567890123456789012345678901234567890"
        address = resolve_token_address(input_address, "base")
        assert address == input_address.lower()

    def test_resolve_contract_address_mixed_case(self):
        """Test resolving contract address with mixed case."""
        input_address = "0xAbCdEf1234567890123456789012345678901234"
        address = resolve_token_address(input_address, "base")
        assert address == input_address.lower()

    def test_resolve_unknown_token(self):
        """Test resolving unknown token symbol."""
        with pytest.raises(ValueError) as exc_info:
            resolve_token_address("unknown", "base")
        assert "Unknown token: unknown" in str(exc_info.value)

    def test_resolve_token_unsupported_network(self):
        """Test resolving token on unsupported network."""
        with pytest.raises(ValueError) as exc_info:
            resolve_token_address("usdc", "ethereum-mainnet")
        assert "Token usdc is not supported on network ethereum-mainnet" in str(exc_info.value)


class TestFormatAmount:
    """Test format_amount function."""

    def test_format_integer_amount(self):
        """Test formatting integer amount."""
        amount = format_amount(1000000)
        assert amount == "1000000"

    def test_format_string_no_decimal(self):
        """Test formatting string amount without decimal."""
        amount = format_amount("1", decimals=18)
        assert amount == "1000000000000000000"

    def test_format_string_with_decimal(self):
        """Test formatting string amount with decimal."""
        amount = format_amount("1.5", decimals=18)
        assert amount == "1500000000000000000"

    def test_format_string_many_decimals(self):
        """Test formatting string with many decimal places."""
        amount = format_amount("1.123456789012345678901234", decimals=18)
        assert amount == "1123456789012345678"

    def test_format_string_usdc_decimals(self):
        """Test formatting with USDC decimals (6)."""
        amount = format_amount("100.5", decimals=6)
        assert amount == "100500000"

    def test_format_string_trailing_zeros(self):
        """Test formatting with trailing zeros."""
        amount = format_amount("1.100", decimals=18)
        assert amount == "1100000000000000000"

    def test_format_zero_amount(self):
        """Test formatting zero amount."""
        amount = format_amount("0", decimals=18)
        assert amount == "0"

    def test_format_small_decimal(self):
        """Test formatting very small decimal."""
        amount = format_amount("0.000001", decimals=18)
        assert amount == "1000000000000"


class TestCalculateMinimumAmountOut:
    """Test calculate_minimum_amount_out function."""

    def test_calculate_with_half_percent_slippage(self):
        """Test calculating minimum with 0.5% slippage."""
        min_amount = calculate_minimum_amount_out("1000000", 0.5)
        assert min_amount == "995000"

    def test_calculate_with_one_percent_slippage(self):
        """Test calculating minimum with 1% slippage."""
        min_amount = calculate_minimum_amount_out("1000000", 1.0)
        assert min_amount == "990000"

    def test_calculate_with_five_percent_slippage(self):
        """Test calculating minimum with 5% slippage."""
        min_amount = calculate_minimum_amount_out("1000000", 5.0)
        assert min_amount == "950000"

    def test_calculate_with_zero_slippage(self):
        """Test calculating minimum with 0% slippage."""
        min_amount = calculate_minimum_amount_out("1000000", 0.0)
        assert min_amount == "1000000"

    def test_calculate_large_amount(self):
        """Test calculating minimum for large amount."""
        min_amount = calculate_minimum_amount_out("1000000000000000000", 0.5)
        assert min_amount == "995000000000000000"

    def test_calculate_rounding_down(self):
        """Test that calculation rounds down."""
        # With 0.3% slippage on 1000, minimum should be 997 (not 997.x)
        min_amount = calculate_minimum_amount_out("1000", 0.3)
        assert min_amount == "997"
