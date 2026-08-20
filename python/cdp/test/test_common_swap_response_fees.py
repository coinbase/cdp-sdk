"""Regression tests for nullable swap response fees."""

from cdp.openapi_client.models.common_swap_response_fees import (
    CommonSwapResponseFees,
)


def test_common_swap_response_fees_accepts_null_gas_fee():
    """Deserialize the nullable gas fee returned by the Swap API."""
    fees = CommonSwapResponseFees.from_dict(
        {
            "gasFee": None,
            "protocolFee": {
                "amount": "0",
                "token": "0x0000000000000000000000000000000000000000",
            },
        }
    )

    assert fees.gas_fee is None
    assert fees.protocol_fee.amount == "0"


def test_common_swap_response_fees_accepts_null_protocol_fee():
    """Deserialize the nullable protocol fee returned by the Swap API."""
    fees = CommonSwapResponseFees.from_dict(
        {
            "gasFee": {
                "amount": "0",
                "token": "0x0000000000000000000000000000000000000000",
            },
            "protocolFee": None,
        }
    )

    assert fees.gas_fee.amount == "0"
    assert fees.protocol_fee is None
