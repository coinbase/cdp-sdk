from datetime import datetime, timezone

import pytest

from cdp.openapi_client.models.add_end_user_evm_account201_response import (
    AddEndUserEvmAccount201Response,
)
from cdp.openapi_client.models.add_end_user_evm_smart_account201_response import (
    AddEndUserEvmSmartAccount201Response,
)
from cdp.openapi_client.models.add_end_user_solana_account201_response import (
    AddEndUserSolanaAccount201Response,
)
from cdp.openapi_client.models.end_user import AuthenticationMethod, EndUser
from cdp.openapi_client.models.end_user_evm_account import EndUserEvmAccount
from cdp.openapi_client.models.end_user_evm_smart_account import EndUserEvmSmartAccount
from cdp.openapi_client.models.end_user_solana_account import EndUserSolanaAccount
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


@pytest.fixture
def add_end_user_evm_account_response_factory():
    """Create and return a factory for Add End User EVM Account response fixtures."""

    def _create_add_end_user_evm_account_response(
        address="0x1234567890123456789012345678901234567890",
        created_at=None,
    ):
        if created_at is None:
            created_at = datetime.now(timezone.utc)

        return AddEndUserEvmAccount201Response(
            evm_account=EndUserEvmAccount(
                address=address,
                created_at=created_at,
            ),
        )

    return _create_add_end_user_evm_account_response


@pytest.fixture
def add_end_user_evm_smart_account_response_factory():
    """Create and return a factory for Add End User EVM Smart Account response fixtures."""

    def _create_add_end_user_evm_smart_account_response(
        address="0x1234567890123456789012345678901234567890",
        owner_addresses=None,
        created_at=None,
    ):
        if owner_addresses is None:
            owner_addresses = ["0x0987654321098765432109876543210987654321"]
        if created_at is None:
            created_at = datetime.now(timezone.utc)

        return AddEndUserEvmSmartAccount201Response(
            evm_smart_account=EndUserEvmSmartAccount(
                address=address,
                owner_addresses=owner_addresses,
                created_at=created_at,
            ),
        )

    return _create_add_end_user_evm_smart_account_response


@pytest.fixture
def add_end_user_solana_account_response_factory():
    """Create and return a factory for Add End User Solana Account response fixtures."""

    def _create_add_end_user_solana_account_response(
        address="7EYnhQoR9YM3N7UoaKRoA44Uy8JeaZV3qyouov87awMs",
        created_at=None,
    ):
        if created_at is None:
            created_at = datetime.now(timezone.utc)

        return AddEndUserSolanaAccount201Response(
            solana_account=EndUserSolanaAccount(
                address=address,
                created_at=created_at,
            ),
        )

    return _create_add_end_user_solana_account_response
