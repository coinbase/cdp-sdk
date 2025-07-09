import pytest

from cdp.evm_smart_account import EvmSmartAccount
from cdp.openapi_client.models.evm_smart_account import (
    EvmSmartAccount as EvmSmartAccountModel,
)


@pytest.fixture
def smart_account_model_factory():
    """Create and return a factory for EVM smart account model fixtures."""

    def _create_smart_account_model(
        smart_account_address="0x1234567890123456789012345678901234567890",
        name="test-smart-account",
        owners=None,
    ):
        """Create and return a factory for EVM smart account model fixtures."""
        if owners is None:
            owners = ["0x1234567890123456789012345678901234567890"]
        return EvmSmartAccountModel(address=smart_account_address, owners=owners, name=name)

    return _create_smart_account_model


@pytest.fixture
def smart_account_factory(local_account_factory):
    """Create and return a factory for EVM smart account fixtures."""

    def _create_smart_account(
        smart_account_address="0x1234567890123456789012345678901234567890",
        name="test-smart-account",
        account=local_account_factory,
        policies=None,
    ):
        return EvmSmartAccount(smart_account_address, account, name, policies)

    return _create_smart_account
