from datetime import datetime
from unittest.mock import AsyncMock

import pytest

from cdp.end_user_account import EndUserAccount
from cdp.openapi_client.models.add_end_user_evm_account201_response import (
    AddEndUserEvmAccount201Response,
)
from cdp.openapi_client.models.add_end_user_evm_smart_account201_response import (
    AddEndUserEvmSmartAccount201Response,
)
from cdp.openapi_client.models.add_end_user_evm_smart_account_request import (
    AddEndUserEvmSmartAccountRequest,
)
from cdp.openapi_client.models.add_end_user_solana_account201_response import (
    AddEndUserSolanaAccount201Response,
)
from cdp.openapi_client.models.authentication_method import AuthenticationMethod
from cdp.openapi_client.models.end_user import EndUser as EndUserModel


def create_mock_end_user_model():
    """Create a mock EndUserModel for testing."""
    mock = AsyncMock(spec=EndUserModel)
    mock.user_id = "test-user-id"
    mock.authentication_methods = [AuthenticationMethod(type="email", email="user@example.com")]
    mock.mfa_methods = None
    mock.evm_accounts = ["0x1234567890abcdef1234567890abcdef12345678"]
    mock.evm_account_objects = []
    mock.evm_smart_accounts = []
    mock.evm_smart_account_objects = []
    mock.solana_accounts = []
    mock.solana_account_objects = []
    mock.created_at = datetime.now()
    return mock


@pytest.mark.asyncio
async def test_end_user_account_initialization():
    """Test EndUserAccount initialization from EndUserModel."""
    mock_end_user_model = create_mock_end_user_model()
    mock_api_clients = AsyncMock()

    end_user_account = EndUserAccount(mock_end_user_model, mock_api_clients)

    assert end_user_account.user_id == mock_end_user_model.user_id
    assert end_user_account.authentication_methods == mock_end_user_model.authentication_methods
    assert end_user_account.mfa_methods == mock_end_user_model.mfa_methods
    assert end_user_account.evm_accounts == mock_end_user_model.evm_accounts
    assert end_user_account.evm_account_objects == mock_end_user_model.evm_account_objects
    assert end_user_account.evm_smart_accounts == mock_end_user_model.evm_smart_accounts
    assert (
        end_user_account.evm_smart_account_objects == mock_end_user_model.evm_smart_account_objects
    )
    assert end_user_account.solana_accounts == mock_end_user_model.solana_accounts
    assert end_user_account.solana_account_objects == mock_end_user_model.solana_account_objects
    assert end_user_account.created_at == mock_end_user_model.created_at


@pytest.mark.asyncio
async def test_end_user_account_str():
    """Test EndUserAccount string representation."""
    mock_end_user_model = create_mock_end_user_model()
    mock_api_clients = AsyncMock()

    end_user_account = EndUserAccount(mock_end_user_model, mock_api_clients)

    assert str(end_user_account) == "EndUserAccount(user_id=test-user-id)"
    assert repr(end_user_account) == "EndUserAccount(user_id=test-user-id)"


@pytest.mark.asyncio
async def test_add_evm_account():
    """Test adding an EVM EOA account to an end user."""
    mock_end_user_model = create_mock_end_user_model()
    mock_api_clients = AsyncMock()
    mock_end_user_api = AsyncMock()
    mock_api_clients.end_user = mock_end_user_api

    mock_response = AsyncMock(spec=AddEndUserEvmAccount201Response)
    mock_response.evm_account = AsyncMock()
    mock_response.evm_account.address = "0xnewaddress"
    mock_end_user_api.add_end_user_evm_account = AsyncMock(return_value=mock_response)

    end_user_account = EndUserAccount(mock_end_user_model, mock_api_clients)

    result = await end_user_account.add_evm_account()

    mock_end_user_api.add_end_user_evm_account.assert_called_once_with(
        user_id="test-user-id",
        body={},
    )
    assert result == mock_response


@pytest.mark.asyncio
async def test_add_evm_smart_account():
    """Test adding an EVM smart account to an end user."""
    mock_end_user_model = create_mock_end_user_model()
    mock_api_clients = AsyncMock()
    mock_end_user_api = AsyncMock()
    mock_api_clients.end_user = mock_end_user_api

    mock_response = AsyncMock(spec=AddEndUserEvmSmartAccount201Response)
    mock_response.evm_smart_account = AsyncMock()
    mock_response.evm_smart_account.address = "0xsmartaccount"
    mock_end_user_api.add_end_user_evm_smart_account = AsyncMock(return_value=mock_response)

    end_user_account = EndUserAccount(mock_end_user_model, mock_api_clients)

    result = await end_user_account.add_evm_smart_account(enable_spend_permissions=True)

    mock_end_user_api.add_end_user_evm_smart_account.assert_called_once_with(
        user_id="test-user-id",
        add_end_user_evm_smart_account_request=AddEndUserEvmSmartAccountRequest(
            enable_spend_permissions=True,
        ),
    )
    assert result == mock_response


@pytest.mark.asyncio
async def test_add_evm_smart_account_without_spend_permissions():
    """Test adding an EVM smart account without spend permissions."""
    mock_end_user_model = create_mock_end_user_model()
    mock_api_clients = AsyncMock()
    mock_end_user_api = AsyncMock()
    mock_api_clients.end_user = mock_end_user_api

    mock_response = AsyncMock(spec=AddEndUserEvmSmartAccount201Response)
    mock_end_user_api.add_end_user_evm_smart_account = AsyncMock(return_value=mock_response)

    end_user_account = EndUserAccount(mock_end_user_model, mock_api_clients)

    result = await end_user_account.add_evm_smart_account(enable_spend_permissions=False)

    mock_end_user_api.add_end_user_evm_smart_account.assert_called_once_with(
        user_id="test-user-id",
        add_end_user_evm_smart_account_request=AddEndUserEvmSmartAccountRequest(
            enable_spend_permissions=False,
        ),
    )
    assert result == mock_response


@pytest.mark.asyncio
async def test_add_solana_account():
    """Test adding a Solana account to an end user."""
    mock_end_user_model = create_mock_end_user_model()
    mock_api_clients = AsyncMock()
    mock_end_user_api = AsyncMock()
    mock_api_clients.end_user = mock_end_user_api

    mock_response = AsyncMock(spec=AddEndUserSolanaAccount201Response)
    mock_response.solana_account = AsyncMock()
    mock_response.solana_account.address = "SoLaNaAdDrEsS"
    mock_end_user_api.add_end_user_solana_account = AsyncMock(return_value=mock_response)

    end_user_account = EndUserAccount(mock_end_user_model, mock_api_clients)

    result = await end_user_account.add_solana_account()

    mock_end_user_api.add_end_user_solana_account.assert_called_once_with(
        user_id="test-user-id",
        body={},
    )
    assert result == mock_response
