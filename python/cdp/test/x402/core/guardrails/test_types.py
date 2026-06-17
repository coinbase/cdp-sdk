"""Unit tests for guardrails/types.py — Amount, SpendControlError, and parsers."""

from __future__ import annotations

import pytest

from cdp.x402.core.guardrails.types import (
    Amount,
    SpendControlError,
    SpendControlErrorCodes,
    SpendControls,
    parse_amount,
    parse_duration,
)

# ---------------------------------------------------------------------------
# SpendControlError
# ---------------------------------------------------------------------------


class TestSpendControlError:
    def test_code_and_details_are_stored(self) -> None:
        err = SpendControlError("per_payment_cap", "boom", {"attempted": "5", "limit": "1"})
        assert err.code == "per_payment_cap"
        assert err.details == {"attempted": "5", "limit": "1"}

    def test_details_defaults_to_empty_dict(self) -> None:
        err = SpendControlError("configuration_invalid", "bad")
        assert err.details == {}

    def test_is_exception(self) -> None:
        err = SpendControlError("cumulative_cap", "over limit")
        assert isinstance(err, Exception)
        assert str(err) == "over limit"


# ---------------------------------------------------------------------------
# SpendControlErrorCodes
# ---------------------------------------------------------------------------


class TestSpendControlErrorCodes:
    def test_exposes_every_error_code_as_a_typed_string_constant(self) -> None:
        assert SpendControlErrorCodes.PER_PAYMENT_CAP == "per_payment_cap"
        assert SpendControlErrorCodes.CUMULATIVE_CAP == "cumulative_cap"
        assert SpendControlErrorCodes.ALREADY_APPLIED == "already_applied"
        assert SpendControlErrorCodes.CONFIGURATION_INVALID == "configuration_invalid"
        assert SpendControlErrorCodes.LEDGER_CAPACITY_EXCEEDED == "ledger_capacity_exceeded"
        assert SpendControlErrorCodes.NETWORK_NOT_ALLOWED == "network_not_allowed"
        assert SpendControlErrorCodes.ASSET_NOT_ALLOWED == "asset_not_allowed"
        assert SpendControlErrorCodes.PAYEE_NOT_ALLOWED == "payee_not_allowed"
        assert SpendControlErrorCodes.AMOUNT_UNPARSEABLE == "amount_unparseable"

    def test_constants_match_codes_on_spend_control_error_instances(self) -> None:
        err = SpendControlError(SpendControlErrorCodes.CUMULATIVE_CAP, "boom")
        assert err.code == SpendControlErrorCodes.CUMULATIVE_CAP
        assert err.code == "cumulative_cap"


# ---------------------------------------------------------------------------
# parse_duration
# ---------------------------------------------------------------------------


class TestParseDuration:
    @pytest.mark.parametrize(
        "value, expected_ms",
        [
            (0, 0),
            (500, 500),
            (3600000, 3600000),
            (1.5, 1),
            ("500ms", 500),
            ("30s", 30_000),
            ("5m", 300_000),
            ("1h", 3_600_000),
            ("24h", 86_400_000),
            ("7d", 604_800_000),
            ("0ms", 0),
            ("  1h  ", 3_600_000),
            ("1H", 3_600_000),
        ],
    )
    def test_valid_inputs(self, value: object, expected_ms: int) -> None:
        assert parse_duration(value) == expected_ms  # type: ignore[arg-type]

    def test_zero_int_returns_zero(self) -> None:
        assert parse_duration(0) == 0

    @pytest.mark.parametrize(
        "bad",
        [
            "1x",
            "abc",
            "",
            "  ",
            "-1s",
            "1.5.2s",
        ],
    )
    def test_invalid_string_raises(self, bad: str) -> None:
        with pytest.raises(SpendControlError) as exc_info:
            parse_duration(bad)
        assert exc_info.value.code == "amount_unparseable"

    def test_negative_number_raises(self) -> None:
        with pytest.raises(SpendControlError) as exc_info:
            parse_duration(-1)
        assert exc_info.value.code == "amount_unparseable"

    def test_infinity_raises(self) -> None:
        import math

        with pytest.raises(SpendControlError) as exc_info:
            parse_duration(math.inf)
        assert exc_info.value.code == "amount_unparseable"

    def test_nan_raises(self) -> None:
        import math

        with pytest.raises(SpendControlError) as exc_info:
            parse_duration(math.nan)
        assert exc_info.value.code == "amount_unparseable"


# ---------------------------------------------------------------------------
# parse_amount
# ---------------------------------------------------------------------------


class TestParseAmount:
    def test_int_zero(self) -> None:
        result = parse_amount(0)
        assert result.atomic == 0
        assert result.asset is None

    def test_int_with_asset(self) -> None:
        result = parse_amount(1_000_000, "0xabc")
        assert result.atomic == 1_000_000
        assert result.asset == "0xabc"

    def test_negative_int_raises(self) -> None:
        with pytest.raises(SpendControlError) as exc_info:
            parse_amount(-1)
        assert exc_info.value.code == "amount_unparseable"

    def test_string_decimal_integer(self) -> None:
        result = parse_amount("100000")
        assert result.atomic == 100_000
        assert result.asset is None

    def test_string_shorthand(self) -> None:
        result = parse_amount("0xabc:1000000")
        assert result.atomic == 1_000_000
        assert result.asset == "0xabc"

    def test_string_shorthand_asset_override(self) -> None:
        result = parse_amount("0xabc:1000", "0xdef")
        assert result.atomic == 1_000
        assert result.asset == "0xdef"

    def test_empty_string_raises(self) -> None:
        with pytest.raises(SpendControlError) as exc_info:
            parse_amount("")
        assert exc_info.value.code == "amount_unparseable"

    def test_non_numeric_string_raises(self) -> None:
        with pytest.raises(SpendControlError) as exc_info:
            parse_amount("one million")
        assert exc_info.value.code == "amount_unparseable"

    def test_underscored_string_raises(self) -> None:
        with pytest.raises(SpendControlError) as exc_info:
            parse_amount("1_000")
        assert exc_info.value.code == "amount_unparseable"

    def test_amount_object_int_atomic(self) -> None:
        result = parse_amount(Amount(atomic=500_000, asset="0xabc"))
        assert result.atomic == 500_000
        assert result.asset == "0xabc"

    def test_amount_object_str_atomic(self) -> None:
        result = parse_amount(Amount(atomic="750000"))
        assert result.atomic == 750_000
        assert result.asset is None

    def test_asset_override_wins_over_amount_object(self) -> None:
        result = parse_amount(Amount(atomic=100, asset="inner"), "outer")
        assert result.asset == "outer"

    def test_amount_object_float_atomic_raises(self) -> None:
        with pytest.raises(SpendControlError) as exc_info:
            parse_amount(Amount(atomic=1.5))  # type: ignore[arg-type]
        assert exc_info.value.code == "amount_unparseable"

    def test_bool_raises(self) -> None:
        with pytest.raises(SpendControlError) as exc_info:
            parse_amount(True)  # type: ignore[arg-type]
        assert exc_info.value.code == "amount_unparseable"

    def test_unsupported_type_raises(self) -> None:
        with pytest.raises(SpendControlError) as exc_info:
            parse_amount([1, 2, 3])  # type: ignore[arg-type]
        assert exc_info.value.code == "amount_unparseable"


class TestSpendControls:
    def test_all_fields_omitted_passes_validation(self) -> None:
        controls = SpendControls()
        assert controls.max_amount_per_payment is None
        assert controls.max_cumulative_spend is None
        assert controls.max_cumulative_spend_window is None
        assert controls.allowed_networks is None
        assert controls.allowed_assets is None
        assert controls.allowed_payees is None
        assert controls.on_approaching_limit is None
        assert controls.approaching_limit_thresholds is None
        assert controls.max_ledger_entries is None
        assert controls.store is None

    def test_unknown_field_is_rejected(self) -> None:
        with pytest.raises(Exception):  # noqa: B017,PT011
            SpendControls(max_cummulative_spend=Amount(atomic=1))  # type: ignore[call-arg]

    def test_amount_dict_with_bad_atomic_raises_spend_control_error(self) -> None:
        with pytest.raises(SpendControlError) as exc_info:
            SpendControls(max_amount_per_payment={"atomic": "abc", "asset": "usdc"})  # type: ignore[arg-type]
        assert exc_info.value.code == "amount_unparseable"

    def test_amount_int_input_is_coerced(self) -> None:
        controls = SpendControls(max_amount_per_payment=1000)  # type: ignore[arg-type]
        assert isinstance(controls.max_amount_per_payment, Amount)
        assert controls.max_amount_per_payment.atomic == 1000

    def test_amount_instance_is_preserved(self) -> None:
        amount = Amount(atomic=500, asset="usdc")
        controls = SpendControls(max_amount_per_payment=amount)
        assert controls.max_amount_per_payment is amount
