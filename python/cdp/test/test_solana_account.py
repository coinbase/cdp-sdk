from unittest.mock import AsyncMock, MagicMock

import pytest

from cdp.openapi_client.models.request_solana_faucet200_response import (
    RequestSolanaFaucet200Response as RequestSolanaFaucetResponse,
)
from cdp.openapi_client.models.request_solana_faucet_request import RequestSolanaFaucetRequest
from cdp.openapi_client.models.sign_solana_message200_response import (
    SignSolanaMessage200Response as SignSolanaMessageResponse,
)
from cdp.openapi_client.models.sign_solana_message_request import SignSolanaMessageRequest
from cdp.openapi_client.models.sign_solana_transaction200_response import (
    SignSolanaTransaction200Response as SignSolanaTransactionResponse,
)
from cdp.openapi_client.models.sign_solana_transaction_request import SignSolanaTransactionRequest
from cdp.openapi_client.models.solana_account import SolanaAccount as SolanaAccountModel
from cdp.solana_account import SolanaAccount


def test_initialization():
    """Test that the SolanaAccount initializes correctly."""
    address = "14grJpemFaf88c8tiVb77W7TYg2W3ir6pfkKz3YjhhZ5"
    name = "test-account"

    solana_account_model = SolanaAccountModel(address=address, name=name)
    mock_api_clients = MagicMock()
    account = SolanaAccount(solana_account_model, mock_api_clients)

    assert account.address == address
    assert account.name == name


def test_str_representation():
    """Test the string representation of SolanaAccount."""
    address = "14grJpemFaf88c8tiVb77W7TYg2W3ir6pfkKz3YjhhZ5"
    solana_account_model = SolanaAccountModel(address=address)
    mock_api_clients = MagicMock()
    account = SolanaAccount(solana_account_model, mock_api_clients)

    expected = f"Solana Account Address: {address}"
    assert str(account) == expected


def test_repr_representation():
    """Test the repr representation of SolanaAccount."""
    address = "14grJpemFaf88c8tiVb77W7TYg2W3ir6pfkKz3YjhhZ5"
    solana_account_model = SolanaAccountModel(address=address)
    mock_api_clients = MagicMock()
    account = SolanaAccount(solana_account_model, mock_api_clients)

    expected = f"Solana Account Address: {address}"
    assert repr(account) == expected


@pytest.mark.asyncio
async def test_request_faucet():
    """Test request_faucet method."""
    address = "14grJpemFaf88c8tiVb77W7TYg2W3ir6pfkKz3YjhhZ5"
    name = "test-account"
    solana_account_model = SolanaAccountModel(address=address, name=name)

    mock_faucets_api = AsyncMock()
    mock_api_clients = MagicMock()
    mock_api_clients.faucets = mock_faucets_api

    mock_response = RequestSolanaFaucetResponse(transaction_signature="test_tx_signature")
    mock_faucets_api.request_solana_faucet = AsyncMock(return_value=mock_response)

    account = SolanaAccount(solana_account_model, mock_api_clients)

    result = await account.request_faucet(token="sol")

    mock_faucets_api.request_solana_faucet.assert_called_once_with(
        request_solana_faucet_request=RequestSolanaFaucetRequest(
            address=address,
            token="sol",
        )
    )
    assert result == mock_response
    assert result.transaction_signature == "test_tx_signature"


@pytest.mark.asyncio
async def test_sign_message():
    """Test sign_message method."""
    address = "14grJpemFaf88c8tiVb77W7TYg2W3ir6pfkKz3YjhhZ5"
    name = "test-account"
    solana_account_model = SolanaAccountModel(address=address, name=name)

    mock_solana_accounts_api = AsyncMock()
    mock_api_clients = MagicMock()
    mock_api_clients.solana_accounts = mock_solana_accounts_api

    mock_response = SignSolanaMessageResponse(signature="test_signature")
    mock_solana_accounts_api.sign_solana_message = AsyncMock(return_value=mock_response)

    account = SolanaAccount(solana_account_model, mock_api_clients)

    test_message = "Hello, Solana!"
    test_idempotency_key = "test-idempotency-key"
    result = await account.sign_message(
        message=test_message,
        idempotency_key=test_idempotency_key,
    )

    mock_solana_accounts_api.sign_solana_message.assert_called_once_with(
        sign_solana_message_request=SignSolanaMessageRequest(
            message=test_message,
        ),
        address=address,
        x_idempotency_key=test_idempotency_key,
    )
    assert result == mock_response
    assert result.signature == "test_signature"


@pytest.mark.asyncio
async def test_sign_transaction():
    """Test sign_transaction method."""
    address = "14grJpemFaf88c8tiVb77W7TYg2W3ir6pfkKz3YjhhZ5"
    name = "test-account"
    solana_account_model = SolanaAccountModel(address=address, name=name)

    mock_solana_accounts_api = AsyncMock()
    mock_api_clients = MagicMock()
    mock_api_clients.solana_accounts = mock_solana_accounts_api

    mock_response = SignSolanaTransactionResponse(signed_transaction="test_signed_transaction")
    mock_solana_accounts_api.sign_solana_transaction = AsyncMock(return_value=mock_response)

    account = SolanaAccount(solana_account_model, mock_api_clients)

    test_transaction = "test_transaction_data"
    test_idempotency_key = "test-idempotency-key"
    result = await account.sign_transaction(
        transaction=test_transaction,
        idempotency_key=test_idempotency_key,
    )

    mock_solana_accounts_api.sign_solana_transaction.assert_called_once_with(
        sign_solana_transaction_request=SignSolanaTransactionRequest(
            transaction=test_transaction,
        ),
        address=address,
        x_idempotency_key=test_idempotency_key,
    )
    assert result == mock_response
    assert result.signed_transaction == "test_signed_transaction"


@pytest.mark.asyncio
async def test_request_faucet_error():
    """Test request_faucet error handling."""
    address = "14grJpemFaf88c8tiVb77W7TYg2W3ir6pfkKz3YjhhZ5"
    name = "test-account"
    solana_account_model = SolanaAccountModel(address=address, name=name)

    mock_faucets_api = AsyncMock()
    mock_api_clients = MagicMock()
    mock_api_clients.faucets = mock_faucets_api

    mock_faucets_api.request_solana_faucet = AsyncMock(side_effect=Exception("API Error"))

    account = SolanaAccount(solana_account_model, mock_api_clients)

    with pytest.raises(Exception) as exc_info:
        await account.request_faucet(token="sol")

    assert str(exc_info.value) == "API Error"


@pytest.mark.asyncio
async def test_sign_message_error():
    """Test sign_message error handling."""
    address = "14grJpemFaf88c8tiVb77W7TYg2W3ir6pfkKz3YjhhZ5"
    name = "test-account"
    solana_account_model = SolanaAccountModel(address=address, name=name)

    mock_solana_accounts_api = AsyncMock()
    mock_api_clients = MagicMock()
    mock_api_clients.solana_accounts = mock_solana_accounts_api

    mock_solana_accounts_api.sign_solana_message = AsyncMock(side_effect=Exception("API Error"))

    account = SolanaAccount(solana_account_model, mock_api_clients)

    with pytest.raises(Exception) as exc_info:
        await account.sign_message(message="test_message")

    assert str(exc_info.value) == "API Error"


@pytest.mark.asyncio
async def test_sign_transaction_error():
    """Test sign_transaction error handling."""
    address = "14grJpemFaf88c8tiVb77W7TYg2W3ir6pfkKz3YjhhZ5"
    name = "test-account"
    solana_account_model = SolanaAccountModel(address=address, name=name)

    mock_solana_accounts_api = AsyncMock()
    mock_api_clients = MagicMock()
    mock_api_clients.solana_accounts = mock_solana_accounts_api

    mock_solana_accounts_api.sign_solana_transaction = AsyncMock(side_effect=Exception("API Error"))

    account = SolanaAccount(solana_account_model, mock_api_clients)

    with pytest.raises(Exception) as exc_info:
        await account.sign_transaction(transaction="test_transaction")

    assert str(exc_info.value) == "API Error"
