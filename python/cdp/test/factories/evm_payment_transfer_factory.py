import pytest

from cdp.openapi_client.models.crypto_rail_address import CryptoRailAddress
from cdp.openapi_client.models.payment_method_request import PaymentMethodRequest
from cdp.openapi_client.models.transfer import Transfer
from cdp.openapi_client.models.transfer_source import TransferSource
from cdp.openapi_client.models.transfer_target import TransferTarget


@pytest.fixture
def payment_transfer_model_factory():
    """Create and return a factory for Payment Transfer fixtures."""

    def _create_payment_transfer_model(
        id="123e4567-e89b-12d3-a456-426614174000",
        source_type="payment_method",
        source=None,
        target_type="crypto_rail",
        target=None,
        source_amount="1",
        source_currency="usd",
        target_amount="1",
        target_currency="usdc",
        user_amount="1",
        user_currency="usd",
        fees=None,
        status="pending",
        created_at="2021-01-01T00:00:00.000Z",
        updated_at="2021-01-01T00:00:00.000Z",
    ):
        if fees is None:
            fees = []
        if source is None:
            source = TransferSource(PaymentMethodRequest(id="123e4567-e89b-12d3-a456-426614174000"))
        if target is None:
            target = TransferTarget(
                CryptoRailAddress(
                    currency="usdc",
                    network="base",
                    address="0x1234567890123456789012345678901234567890",
                )
            )
        return Transfer(
            id=id,
            source_type=source_type,
            source=source,
            target_type=target_type,
            target=target,
            source_amount=source_amount,
            source_currency=source_currency,
            target_amount=target_amount,
            target_currency=target_currency,
            user_amount=user_amount,
            user_currency=user_currency,
            fees=fees,
            status=status,
            created_at=created_at,
            updated_at=updated_at,
        )

    return _create_payment_transfer_model
