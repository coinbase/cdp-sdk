import pytest

from cdp.utils import InvalidDecimalNumberError, parse_units


def test_parse_units_basic():
    """Test basic parsing of decimal numbers."""
    assert parse_units("1.0", 18) == 10**18
    assert parse_units("0.1", 18) == 10**17
    assert parse_units("0.01", 18) == 10**16
    assert parse_units("1", 18) == 10**18
    assert parse_units("0", 18) == 0


def test_parse_units_negative():
    """Test parsing of negative numbers."""
    assert parse_units("-1.0", 18) == -(10**18)
    assert parse_units("-0.1", 18) == -(10**17)
    assert parse_units("-1", 18) == -(10**18)


def test_parse_units_rounding():
    """Test rounding behavior."""
    # Test rounding up
    assert parse_units("1.5", 1) == 15
    assert parse_units("1.55", 1) == 16
    assert parse_units("1.999", 2) == 200

    # Test rounding down
    assert parse_units("1.4", 1) == 14
    assert parse_units("1.44", 1) == 14


def test_parse_units_rounds_ties_up():
    """Test that a fraction exactly halfway between two units rounds up."""
    assert parse_units("0.5", 0) == 1
    assert parse_units("1.5", 0) == 2
    assert parse_units("2.5", 0) == 3
    assert parse_units("1.25", 1) == 13
    assert parse_units("0.125", 2) == 13
    assert parse_units("0.0000005", 6) == 1
    assert parse_units("-1.25", 1) == -13


def test_parse_units_rounding_carries_into_integer():
    """Test rounding that carries past the first fraction digit into the integer part."""
    assert parse_units("0.99", 1) == 10
    assert parse_units("0.95", 1) == 10
    assert parse_units("9.99", 1) == 100
    assert parse_units("0.999", 2) == 100
    assert parse_units("-0.99", 1) == -10


def test_parse_units_without_integer_part():
    """Test values written without a leading zero."""
    assert parse_units(".5", 1) == 5
    assert parse_units(".5", 0) == 1
    assert parse_units(".99", 1) == 10


def test_parse_units_trailing_zeros():
    """Test handling of trailing zeros."""
    assert parse_units("1.000", 2) == 100
    assert parse_units("1.100", 2) == 110
    assert parse_units("1.000", 0) == 1


def test_parse_units_invalid_input():
    """Test handling of invalid inputs."""
    with pytest.raises(InvalidDecimalNumberError):
        parse_units("abc", 18)

    with pytest.raises(InvalidDecimalNumberError):
        parse_units("1..0", 18)

    with pytest.raises(InvalidDecimalNumberError):
        parse_units("1.0.0", 18)


def test_parse_units_large_numbers():
    """Test handling of large numbers."""
    assert parse_units("1000000.0", 18) == 10**24
    assert parse_units("9999999.999999", 6) == 9999999999999
