import pytest

from cdp.openapi_client.models.end_user import AuthenticationMethod, EndUser


@pytest.fixture
def end_user_model_factory():
    """Create and return a factory for End User fixtures."""

    def _create_end_user_model(
        user_id="1234567890",
    ):
        return EndUser(
            user_id=user_id,
            authentication_methods=[AuthenticationMethod(type="email", email="test@test.com")],
            evm_accounts=[],
            solana_accounts=[],
            evm_smart_accounts=[],
        )

    return _create_end_user_model
