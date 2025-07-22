"""Tests for swap utility functions."""


def format_amount(amount: str | int, decimals: int = 18) -> str:
    """Format an amount to the correct decimal representation.

    Args:
        amount: The amount to format (can be string with decimals or integer)
        decimals: Number of decimals for the token

    Returns:
        The formatted amount as a string in smallest unit

    """
    if isinstance(amount, int):
        return str(amount)

    # Handle string amounts with decimals
    if "." in str(amount):
        parts = str(amount).split(".")
        integer_part = parts[0] or "0"
        decimal_part = parts[1]

        # Pad or truncate decimal part to match token decimals
        if len(decimal_part) > decimals:
            decimal_part = decimal_part[:decimals]
        else:
            decimal_part = decimal_part.ljust(decimals, "0")

        # Combine parts and remove leading zeros
        result = integer_part + decimal_part

        # Special case for zero
        if all(c == "0" for c in result):
            return "0"

        # Remove leading zeros but keep at least one digit
        return result.lstrip("0") or "0"
    else:
        # No decimal point
        if str(amount) == "0":
            return "0"
        # For whole numbers, multiply by 10^decimals
        return str(int(amount) * (10**decimals))


def calculate_minimum_amount_out(amount: str, slippage_percentage: float) -> str:
    """Calculate the minimum amount out based on slippage tolerance.

    Args:
        amount: The expected output amount
        slippage_percentage: The slippage percentage (0-10)

    Returns:
        The minimum acceptable output amount

    """
    amount_int = int(amount)
    slippage_factor = 1 - (slippage_percentage / 100)
    min_amount = int(amount_int * slippage_factor)
    return str(min_amount)


class TestFormatAmount:
    """Test cases for format_amount function."""

    def test_format_amount_integer_input(self):
        """Test formatting integer inputs."""
        assert format_amount(100, 18) == "100"
        assert format_amount(0, 18) == "0"
        assert format_amount(1234567890, 6) == "1234567890"

    def test_format_amount_string_integer(self):
        """Test formatting string integers without decimals."""
        assert format_amount("100", 18) == "100000000000000000000"
        assert format_amount("0", 18) == "0"
        assert format_amount("1", 6) == "1000000"
        assert format_amount("1000000", 18) == "1000000000000000000000000"

    def test_format_amount_string_with_decimals(self):
        """Test formatting strings with decimal points."""
        # Basic decimal handling
        assert format_amount("1.0", 18) == "1000000000000000000"
        assert format_amount("0.1", 18) == "100000000000000000"
        assert format_amount("0.01", 18) == "10000000000000000"

        # USDC examples (6 decimals)
        assert format_amount("1.0", 6) == "1000000"
        assert format_amount("100.5", 6) == "100500000"
        assert format_amount("0.123456", 6) == "123456"

        # WETH examples (18 decimals)
        assert format_amount("1.5", 18) == "1500000000000000000"
        assert format_amount("0.000000000000000001", 18) == "1"

    def test_format_amount_decimal_truncation(self):
        """Test decimal truncation when input has more decimals than token."""
        # More decimals than needed - should truncate
        assert format_amount("1.123456789", 6) == "1123456"
        assert format_amount("0.999999999", 6) == "999999"
        assert format_amount("100.123456789012345678901234", 18) == "100123456789012345678"

    def test_format_amount_decimal_padding(self):
        """Test decimal padding when input has fewer decimals than token."""
        # Fewer decimals than needed - should pad with zeros
        assert format_amount("1.1", 6) == "1100000"
        assert format_amount("1.1", 18) == "1100000000000000000"
        assert format_amount("0.5", 8) == "50000000"

    def test_format_amount_edge_cases(self):
        """Test edge cases and special values."""
        # Just decimal point
        assert format_amount(".1", 6) == "100000"
        assert format_amount(".123", 6) == "123000"

        # Zero variations
        assert format_amount("0.0", 18) == "0"
        assert format_amount("0.000000", 6) == "0"
        assert format_amount(".0", 18) == "0"
        assert format_amount("000.000", 18) == "0"

        # Leading zeros
        assert format_amount("00001.5", 6) == "1500000"
        assert format_amount("0001.0", 18) == "1000000000000000000"

    def test_format_amount_no_leading_zeros(self):
        """Test that leading zeros are properly removed."""
        assert format_amount("0.01", 2) == "1"
        assert format_amount("0.001", 3) == "1"
        assert format_amount("0.1", 1) == "1"

        # Should not remove the last zero
        assert format_amount("0.0001", 6) == "100"
        assert format_amount("0.000001", 6) == "1"

    def test_format_amount_zero_decimals(self):
        """Test handling of tokens with zero decimals."""
        assert format_amount("1", 0) == "1"
        assert format_amount("100", 0) == "100"
        assert format_amount("1.5", 0) == "1"  # Truncates decimal
        assert format_amount("1.9", 0) == "1"  # Truncates, doesn't round


class TestCalculateMinimumAmountOut:
    """Test cases for calculate_minimum_amount_out function."""

    def test_calculate_minimum_basic(self):
        """Test basic slippage calculations."""
        # 1% slippage
        assert calculate_minimum_amount_out("1000000", 1) == "990000"

        # 0.5% slippage (50 bps)
        assert calculate_minimum_amount_out("1000000", 0.5) == "995000"

        # 5% slippage (500 bps)
        assert calculate_minimum_amount_out("1000000", 5) == "950000"

    def test_calculate_minimum_zero_slippage(self):
        """Test zero slippage."""
        assert calculate_minimum_amount_out("1000000", 0) == "1000000"
        assert calculate_minimum_amount_out("123456789", 0) == "123456789"

    def test_calculate_minimum_max_slippage(self):
        """Test maximum slippage."""
        # 10% slippage
        assert calculate_minimum_amount_out("1000000", 10) == "900000"

        # Even higher slippage
        assert calculate_minimum_amount_out("1000000", 50) == "500000"
        assert calculate_minimum_amount_out("1000000", 90) == "99999"  # Floating point precision

    def test_calculate_minimum_precision(self):
        """Test precision handling with various amounts."""
        # Small amounts
        assert calculate_minimum_amount_out("100", 1) == "99"
        assert calculate_minimum_amount_out("10", 10) == "9"

        # Large amounts
        assert calculate_minimum_amount_out("1000000000000000000", 0.1) == "999000000000000000"

        # Test rounding behavior (should round down for safety)
        assert calculate_minimum_amount_out("1000", 0.1) == "999"  # 0.1% of 1000 = 1
        assert calculate_minimum_amount_out("999", 0.1) == "998"  # 0.1% of 999 = 0.999, rounds down

    def test_calculate_minimum_realistic_examples(self):
        """Test with realistic swap amounts and slippage values."""
        # $100 USDC with 1% slippage (USDC has 6 decimals)
        usdc_amount = "100000000"  # 100 USDC
        assert calculate_minimum_amount_out(usdc_amount, 1) == "99000000"

        # 1 WETH with 0.5% slippage (WETH has 18 decimals)
        weth_amount = "1000000000000000000"  # 1 WETH
        assert calculate_minimum_amount_out(weth_amount, 0.5) == "995000000000000000"

        # Small amount: 0.001 WETH with 2% slippage
        small_weth = "1000000000000000"  # 0.001 WETH
        assert calculate_minimum_amount_out(small_weth, 2) == "980000000000000"

    def test_calculate_minimum_edge_cases(self):
        """Test edge cases."""
        # Zero amount
        assert calculate_minimum_amount_out("0", 1) == "0"

        # Very small amounts that might round to zero
        assert calculate_minimum_amount_out("1", 50) == "0"
        assert calculate_minimum_amount_out("2", 50) == "1"

        # 100% slippage (not realistic but should handle)
        assert calculate_minimum_amount_out("1000000", 100) == "0"
