from datetime import datetime
from unittest.mock import AsyncMock, MagicMock

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


def create_mock_end_user_model(
    evm_account_objects=None,
    evm_smart_account_objects=None,
    solana_account_objects=None,
):
    """Create a mock EndUserModel for testing."""
    mock = AsyncMock(spec=EndUserModel)
    mock.user_id = "test-user-id"
    mock.authentication_methods = [AuthenticationMethod(type="email", email="user@example.com")]
    mock.mfa_methods = None
    mock.evm_accounts = ["0x1234567890abcdef1234567890abcdef12345678"]
    mock.evm_account_objects = evm_account_objects or []
    mock.evm_smart_accounts = []
    mock.evm_smart_account_objects = evm_smart_account_objects or []
    mock.solana_accounts = []
    mock.solana_account_objects = solana_account_objects or []
    mock.created_at = datetime.now()
    return mock


VALID_EVM_ADDRESS = "0x1234567890abcdef1234567890abcdef12345678"
VALID_EVM_SMART_ADDRESS = "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd"
VALID_SOLANA_ADDRESS = "7EYnhQoR9YM3N7UoaKRoA44Uy8JeaZV3qyouov87awMs"


def _make_evm_account(address=VALID_EVM_ADDRESS):
    """Create a mock EVM account object."""
    acct = MagicMock()
    acct.address = address
    return acct


def _make_evm_smart_account(address=VALID_EVM_SMART_ADDRESS):
    """Create a mock EVM smart account object."""
    acct = MagicMock()
    acct.address = address
    return acct


def _make_solana_account(address=VALID_SOLANA_ADDRESS):
    """Create a mock Solana account object."""
    acct = MagicMock()
    acct.address = address
    return acct


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


# ─── Address Resolver Tests ───


def test_resolve_evm_address_auto():
    """Test auto-resolving EVM address from first account."""
    model = create_mock_end_user_model(evm_account_objects=[_make_evm_account()])
    account = EndUserAccount(model, AsyncMock())
    assert account._resolve_evm_address() == VALID_EVM_ADDRESS


def test_resolve_evm_address_override():
    """Test explicit address override for EVM resolver."""
    model = create_mock_end_user_model(evm_account_objects=[_make_evm_account()])
    account = EndUserAccount(model, AsyncMock())
    assert account._resolve_evm_address("0xoverride") == "0xoverride"


def test_resolve_evm_address_no_account():
    """Test ValueError when no EVM account and no override."""
    model = create_mock_end_user_model()
    account = EndUserAccount(model, AsyncMock())
    with pytest.raises(ValueError, match="No EVM account found"):
        account._resolve_evm_address()


def test_resolve_evm_smart_account_address_auto():
    """Test auto-resolving EVM smart account address."""
    model = create_mock_end_user_model(evm_smart_account_objects=[_make_evm_smart_account()])
    account = EndUserAccount(model, AsyncMock())
    assert account._resolve_evm_smart_account_address() == VALID_EVM_SMART_ADDRESS


def test_resolve_evm_smart_account_address_no_account():
    """Test ValueError when no EVM smart account and no override."""
    model = create_mock_end_user_model()
    account = EndUserAccount(model, AsyncMock())
    with pytest.raises(ValueError, match="No EVM smart account found"):
        account._resolve_evm_smart_account_address()


def test_resolve_solana_address_auto():
    """Test auto-resolving Solana address from first account."""
    model = create_mock_end_user_model(solana_account_objects=[_make_solana_account()])
    account = EndUserAccount(model, AsyncMock())
    assert account._resolve_solana_address() == VALID_SOLANA_ADDRESS


def test_resolve_solana_address_no_account():
    """Test ValueError when no Solana account and no override."""
    model = create_mock_end_user_model()
    account = EndUserAccount(model, AsyncMock())
    with pytest.raises(ValueError, match="No Solana account found"):
        account._resolve_solana_address()


# ─── Delegated Action Method Tests ───


@pytest.mark.asyncio
async def test_revoke_delegation():
    """Test revoking delegation on EndUserAccount."""
    mock_api_clients = AsyncMock()
    mock_api_clients.embedded_wallets.revoke_delegation_for_end_user = AsyncMock(return_value=None)

    model = create_mock_end_user_model()
    account = EndUserAccount(model, mock_api_clients)
    await account.revoke_delegation()

    mock_api_clients.embedded_wallets.revoke_delegation_for_end_user.assert_called_once()
    call_args = mock_api_clients.embedded_wallets.revoke_delegation_for_end_user.call_args
    assert call_args.kwargs["user_id"] == "test-user-id"


@pytest.mark.asyncio
async def test_sign_evm_transaction():
    """Test signing an EVM transaction on EndUserAccount."""
    mock_response = MagicMock()
    mock_api_clients = AsyncMock()
    mock_api_clients.embedded_wallets.sign_evm_transaction_with_end_user_account = AsyncMock(
        return_value=mock_response
    )

    model = create_mock_end_user_model(evm_account_objects=[_make_evm_account()])
    account = EndUserAccount(model, mock_api_clients)
    result = await account.sign_evm_transaction(transaction="0x02...")

    assert result == mock_response
    call_args = (
        mock_api_clients.embedded_wallets.sign_evm_transaction_with_end_user_account.call_args
    )
    assert call_args.kwargs["user_id"] == "test-user-id"
    request = call_args.kwargs["sign_evm_transaction_with_end_user_account_request"]
    assert request.address == VALID_EVM_ADDRESS
    assert request.transaction == "0x02..."


@pytest.mark.asyncio
async def test_sign_evm_message():
    """Test signing an EVM message on EndUserAccount."""
    mock_response = MagicMock()
    mock_api_clients = AsyncMock()
    mock_api_clients.embedded_wallets.sign_evm_message_with_end_user_account = AsyncMock(
        return_value=mock_response
    )

    model = create_mock_end_user_model(evm_account_objects=[_make_evm_account()])
    account = EndUserAccount(model, mock_api_clients)
    result = await account.sign_evm_message(message="Hello")

    assert result == mock_response
    request = (
        mock_api_clients.embedded_wallets.sign_evm_message_with_end_user_account.call_args.kwargs[
            "sign_evm_message_with_end_user_account_request"
        ]
    )
    assert request.address == VALID_EVM_ADDRESS
    assert request.message == "Hello"


@pytest.mark.asyncio
async def test_sign_evm_typed_data():
    """Test signing EVM typed data on EndUserAccount."""
    mock_response = MagicMock()
    mock_api_clients = AsyncMock()
    mock_api_clients.embedded_wallets.sign_evm_typed_data_with_end_user_account = AsyncMock(
        return_value=mock_response
    )

    typed_data = {"domain": {}, "types": {}, "primaryType": "Test", "message": {}}
    model = create_mock_end_user_model(evm_account_objects=[_make_evm_account()])
    account = EndUserAccount(model, mock_api_clients)
    result = await account.sign_evm_typed_data(typed_data=typed_data)

    assert result == mock_response
    request = mock_api_clients.embedded_wallets.sign_evm_typed_data_with_end_user_account.call_args.kwargs[
        "sign_evm_typed_data_with_end_user_account_request"
    ]
    assert request.address == VALID_EVM_ADDRESS


@pytest.mark.asyncio
async def test_send_evm_transaction():
    """Test sending an EVM transaction on EndUserAccount."""
    mock_response = MagicMock()
    mock_api_clients = AsyncMock()
    mock_api_clients.embedded_wallets.send_evm_transaction_with_end_user_account = AsyncMock(
        return_value=mock_response
    )

    model = create_mock_end_user_model(evm_account_objects=[_make_evm_account()])
    account = EndUserAccount(model, mock_api_clients)
    result = await account.send_evm_transaction(transaction="0x02...", network="base-sepolia")

    assert result == mock_response
    request = mock_api_clients.embedded_wallets.send_evm_transaction_with_end_user_account.call_args.kwargs[
        "send_evm_transaction_with_end_user_account_request"
    ]
    assert request.address == VALID_EVM_ADDRESS
    assert request.network == "base-sepolia"


@pytest.mark.asyncio
async def test_send_evm_asset():
    """Test sending an EVM asset on EndUserAccount."""
    mock_response = MagicMock()
    mock_api_clients = AsyncMock()
    mock_api_clients.embedded_wallets.send_evm_asset_with_end_user_account = AsyncMock(
        return_value=mock_response
    )

    recipient = "0xabcdefabcdefabcdefabcdefabcdefabcdefab01"
    model = create_mock_end_user_model(evm_account_objects=[_make_evm_account()])
    account = EndUserAccount(model, mock_api_clients)
    result = await account.send_evm_asset(to=recipient, amount="1.5", network="base-sepolia")

    assert result == mock_response
    call_args = mock_api_clients.embedded_wallets.send_evm_asset_with_end_user_account.call_args
    assert call_args.kwargs["address"] == VALID_EVM_ADDRESS
    assert call_args.kwargs["asset"] == "usdc"
    request = call_args.kwargs["send_evm_asset_with_end_user_account_request"]
    assert request.to == recipient
    assert request.amount == "1.5"


@pytest.mark.asyncio
async def test_send_user_operation():
    """Test sending a user operation on EndUserAccount."""
    mock_response = MagicMock()
    mock_api_clients = AsyncMock()
    mock_api_clients.embedded_wallets.send_user_operation_with_end_user_account = AsyncMock(
        return_value=mock_response
    )

    call_target = "0xabcdefabcdefabcdefabcdefabcdefabcdefab01"
    calls = [{"to": call_target, "value": "0", "data": "0x"}]
    model = create_mock_end_user_model(evm_smart_account_objects=[_make_evm_smart_account()])
    account = EndUserAccount(model, mock_api_clients)
    result = await account.send_user_operation(
        network="base-sepolia", calls=calls, use_cdp_paymaster=True
    )

    assert result == mock_response
    call_args = (
        mock_api_clients.embedded_wallets.send_user_operation_with_end_user_account.call_args
    )
    assert call_args.kwargs["address"] == VALID_EVM_SMART_ADDRESS
    request = call_args.kwargs["send_user_operation_with_end_user_account_request"]
    assert request.network == "base-sepolia"
    assert request.use_cdp_paymaster is True


@pytest.mark.asyncio
async def test_create_evm_eip7702_delegation():
    """Test creating an EIP-7702 delegation on EndUserAccount."""
    mock_response = MagicMock()
    mock_api_clients = AsyncMock()
    mock_api_clients.embedded_wallets.create_evm_eip7702_delegation_with_end_user_account = (
        AsyncMock(return_value=mock_response)
    )

    model = create_mock_end_user_model(evm_account_objects=[_make_evm_account()])
    account = EndUserAccount(model, mock_api_clients)
    result = await account.create_evm_eip7702_delegation(network="base-sepolia")

    assert result == mock_response
    request = mock_api_clients.embedded_wallets.create_evm_eip7702_delegation_with_end_user_account.call_args.kwargs[
        "create_evm_eip7702_delegation_with_end_user_account_request"
    ]
    assert request.address == VALID_EVM_ADDRESS
    assert request.network == "base-sepolia"


@pytest.mark.asyncio
async def test_sign_solana_message():
    """Test signing a Solana message on EndUserAccount."""
    mock_response = MagicMock()
    mock_api_clients = AsyncMock()
    mock_api_clients.embedded_wallets.sign_solana_message_with_end_user_account = AsyncMock(
        return_value=mock_response
    )

    model = create_mock_end_user_model(solana_account_objects=[_make_solana_account()])
    account = EndUserAccount(model, mock_api_clients)
    result = await account.sign_solana_message(message="base64msg")

    assert result == mock_response
    request = mock_api_clients.embedded_wallets.sign_solana_message_with_end_user_account.call_args.kwargs[
        "sign_solana_message_with_end_user_account_request"
    ]
    assert request.address == VALID_SOLANA_ADDRESS
    assert request.message == "base64msg"


@pytest.mark.asyncio
async def test_sign_solana_transaction():
    """Test signing a Solana transaction on EndUserAccount."""
    mock_response = MagicMock()
    mock_api_clients = AsyncMock()
    mock_api_clients.embedded_wallets.sign_solana_transaction_with_end_user_account = AsyncMock(
        return_value=mock_response
    )

    model = create_mock_end_user_model(solana_account_objects=[_make_solana_account()])
    account = EndUserAccount(model, mock_api_clients)
    result = await account.sign_solana_transaction(transaction="base64tx")

    assert result == mock_response
    request = mock_api_clients.embedded_wallets.sign_solana_transaction_with_end_user_account.call_args.kwargs[
        "sign_solana_transaction_with_end_user_account_request"
    ]
    assert request.address == VALID_SOLANA_ADDRESS
    assert request.transaction == "base64tx"


@pytest.mark.asyncio
async def test_send_solana_transaction():
    """Test sending a Solana transaction on EndUserAccount."""
    mock_response = MagicMock()
    mock_api_clients = AsyncMock()
    mock_api_clients.embedded_wallets.send_solana_transaction_with_end_user_account = AsyncMock(
        return_value=mock_response
    )

    model = create_mock_end_user_model(solana_account_objects=[_make_solana_account()])
    account = EndUserAccount(model, mock_api_clients)
    result = await account.send_solana_transaction(transaction="base64tx", network="solana-devnet")

    assert result == mock_response
    request = mock_api_clients.embedded_wallets.send_solana_transaction_with_end_user_account.call_args.kwargs[
        "send_solana_transaction_with_end_user_account_request"
    ]
    assert request.address == VALID_SOLANA_ADDRESS
    assert request.network == "solana-devnet"


@pytest.mark.asyncio
async def test_send_solana_asset():
    """Test sending a Solana asset on EndUserAccount."""
    mock_response = MagicMock()
    mock_api_clients = AsyncMock()
    mock_api_clients.embedded_wallets.send_solana_asset_with_end_user_account = AsyncMock(
        return_value=mock_response
    )

    sol_recipient = "DRpbCBMxVnDK7maPM5tGv6MvB3v1sRMC86PZ8okm21hy"
    model = create_mock_end_user_model(solana_account_objects=[_make_solana_account()])
    account = EndUserAccount(model, mock_api_clients)
    result = await account.send_solana_asset(
        to=sol_recipient, amount="1.5", network="solana-devnet"
    )

    assert result == mock_response
    call_args = mock_api_clients.embedded_wallets.send_solana_asset_with_end_user_account.call_args
    assert call_args.kwargs["address"] == VALID_SOLANA_ADDRESS
    assert call_args.kwargs["asset"] == "usdc"
    request = call_args.kwargs["send_solana_asset_with_end_user_account_request"]
    assert request.to == sol_recipient
    assert request.amount == "1.5"
