import pytest

from cdp.openapi_client.models.payment_method import PaymentMethod
from cdp.openapi_client.models.payment_rail_action import PaymentRailAction


@pytest.fixture
def payment_method_model_factory():
    """Create and return a factory for Payment Method fixtures."""

    def _create_payment_method_model(
        id="123e4567-e89b-12d3-a456-426614174000",
        type="card",
        currency="usd",
        actions=[PaymentRailAction(PaymentRailAction.SOURCE)],
        limits=None,
    ):
        return PaymentMethod(id=id, type=type, currency=currency, actions=actions, limits=limits)

    return _create_payment_method_model
