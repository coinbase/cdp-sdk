from datetime import datetime, timezone

import pytest

from cdp.openapi_client.models.end_user import AuthenticationMethod, EndUser
from cdp.openapi_client.models.list_end_users200_response import ListEndUsers200Response


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
            evm_account_objects=[],
            evm_smart_accounts=[],
            evm_smart_account_objects=[],
            solana_accounts=[],
            solana_account_objects=[],
            created_at=datetime.now(timezone.utc),
        )

    return _create_end_user_model


@pytest.fixture
def list_end_users_response_factory():
    """Create and return a factory for List End Users response fixtures."""

    def _create_list_end_users_response(
        end_users=None,
        next_page_token=None,
    ):
        if end_users is None:
            end_users = []

        return ListEndUsers200Response(
            end_users=end_users,
            next_page_token=next_page_token,
        )

    return _create_list_end_users_response
