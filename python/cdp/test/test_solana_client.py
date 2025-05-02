from unittest.mock import AsyncMock

import pytest

from cdp.openapi_client.errors import ApiError
from cdp.openapi_client.models.create_solana_account_request import (
    CreateSolanaAccountRequest,
)
from cdp.openapi_client.models.list_solana_accounts200_response import (
    ListSolanaAccounts200Response as ListSolanaAccountsResponse,
)
from cdp.openapi_client.models.request_solana_faucet200_response import (
    RequestSolanaFaucet200Response as RequestSolanaFaucetResponse,
)
from cdp.openapi_client.models.request_solana_faucet_request import (
    RequestSolanaFaucetRequest,
)
from cdp.openapi_client.models.sign_solana_message200_response import (
    SignSolanaMessage200Response as SignSolanaMessageResponse,
)
from cdp.openapi_client.models.sign_solana_message_request import (
    SignSolanaMessageRequest,
)
from cdp.openapi_client.models.sign_solana_transaction200_response import (
    SignSolanaTransaction200Response as SignSolanaTransactionResponse,
)
from cdp.openapi_client.models.sign_solana_transaction_request import (
    SignSolanaTransactionRequest,
)
from cdp.openapi_client.models.solana_account import SolanaAccount
from cdp.solana_client import SolanaClient


@pytest.mark.asyncio
async def test_create_account():
    """Test creating a Solana account."""
    mock_solana_accounts_api = AsyncMock()
    mock_api_clients = AsyncMock()
    mock_api_clients.solana_accounts = mock_solana_accounts_api

    mock_sol_account = AsyncMock()
    mock_sol_account.address = "test_sol_address"
    mock_sol_account.name = "test-sol-account"
    mock_solana_accounts_api.create_solana_account = AsyncMock(return_value=mock_sol_account)

    client = SolanaClient(api_clients=mock_api_clients)

    test_name = "test-sol-account"
    test_idempotency_key = "test-idempotency-key"

    result = await client.create_account(name=test_name, idempotency_key=test_idempotency_key)

    mock_solana_accounts_api.create_solana_account.assert_called_once_with(
        x_idempotency_key=test_idempotency_key,
        create_solana_account_request=CreateSolanaAccountRequest(name=test_name),
    )

    assert result == mock_sol_account


@pytest.mark.asyncio
async def test_get_account():
    """Test getting a Solana account by address."""
    mock_solana_accounts_api = AsyncMock()
    mock_api_clients = AsyncMock()
    mock_api_clients.solana_accounts = mock_solana_accounts_api

    mock_sol_account = AsyncMock()
    mock_sol_account.address = "test_sol_address"
    mock_sol_account.name = "test-sol-account"
    mock_solana_accounts_api.get_solana_account = AsyncMock(return_value=mock_sol_account)

    client = SolanaClient(api_clients=mock_api_clients)

    test_address = "test_sol_address"

    result = await client.get_account(address=test_address)

    mock_solana_accounts_api.get_solana_account.assert_called_once_with(test_address)

    assert result == mock_sol_account


@pytest.mark.asyncio
async def test_get_account_by_name(server_account_model_factory):
    """Test getting a Solana account by name."""
    mock_solana_accounts_api = AsyncMock()
    mock_api_clients = AsyncMock()
    mock_api_clients.solana_accounts = mock_solana_accounts_api

    sol_server_account_model = server_account_model_factory()
    mock_solana_accounts_api.get_solana_account_by_name = AsyncMock(
        return_value=sol_server_account_model
    )

    client = SolanaClient(api_clients=mock_api_clients)

    test_name = "test-sol-account"
    result = await client.get_account(name=test_name)

    mock_solana_accounts_api.get_solana_account_by_name.assert_called_once_with(test_name)

    assert result.address == sol_server_account_model.address
    assert result.name == sol_server_account_model.name


@pytest.mark.asyncio
async def test_get_account_throws_error_if_neither_address_nor_name_is_provided():
    """Test that the get_account method throws an error if neither address nor name is provided."""
    client = SolanaClient(api_clients=AsyncMock())
    with pytest.raises(ValueError):
        await client.get_account()


@pytest.mark.asyncio
async def test_get_or_create_account(server_account_model_factory):
    """Test getting or creating a Solana account."""
    mock_solana_accounts_api = AsyncMock()
    mock_api_clients = AsyncMock()
    mock_api_clients.solana_accounts = mock_solana_accounts_api

    mock_sol_account = server_account_model_factory()
    client = SolanaClient(api_clients=mock_api_clients)

    mock_solana_accounts_api.get_solana_account_by_name = AsyncMock(
        side_effect=[
            ApiError(404, "not_found", "Account not found"),
            mock_sol_account,
        ]
    )
    mock_solana_accounts_api.create_solana_account = AsyncMock(return_value=mock_sol_account)

    test_name = "test-sol-account"
    result = await client.get_or_create_account(name=test_name)
    result2 = await client.get_or_create_account(name=test_name)

    assert mock_solana_accounts_api.get_solana_account_by_name.call_count == 2
    mock_solana_accounts_api.create_solana_account.assert_called_once_with(
        x_idempotency_key=None,
        create_solana_account_request=CreateSolanaAccountRequest(name=test_name),
    )

    assert result.address == mock_sol_account.address
    assert result.name == mock_sol_account.name
    assert result2.address == mock_sol_account.address
    assert result2.name == mock_sol_account.name


@pytest.mark.asyncio
async def test_list_accounts():
    """Test listing Solana accounts."""
    mock_solana_accounts_api = AsyncMock()
    mock_api_clients = AsyncMock()
    mock_api_clients.solana_accounts = mock_solana_accounts_api

    mock_sol_account_1 = SolanaAccount(
        address="aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", name="test-sol-account-1"
    )
    mock_sol_account_2 = SolanaAccount(
        address="bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb", name="test-sol-account-2"
    )

    mock_response = ListSolanaAccountsResponse(
        accounts=[mock_sol_account_1, mock_sol_account_2], next_page_token="next-page-token"
    )
    mock_solana_accounts_api.list_solana_accounts = AsyncMock(return_value=mock_response)

    client = SolanaClient(api_clients=mock_api_clients)

    result = await client.list_accounts()

    mock_solana_accounts_api.list_solana_accounts.assert_called_once_with(
        page_size=None, page_token=None
    )

    assert len(result.accounts) == 2
    assert result.next_page_token == "next-page-token"
    assert result.accounts[0].address == "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
    assert result.accounts[1].address == "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"


@pytest.mark.asyncio
async def test_sign_message():
    """Test signing a Solana message."""
    mock_solana_accounts_api = AsyncMock()
    mock_api_clients = AsyncMock()
    mock_api_clients.solana_accounts = mock_solana_accounts_api
    mock_response = SignSolanaMessageResponse(signature="test_signature")
    mock_solana_accounts_api.sign_solana_message = AsyncMock(return_value=mock_response)

    client = SolanaClient(api_clients=mock_api_clients)

    test_address = "test_sol_address"
    test_message = "test_message"
    test_idempotency_key = "test-idempotency-key"

    result = await client.sign_message(
        address=test_address,
        message=test_message,
        idempotency_key=test_idempotency_key,
    )

    mock_solana_accounts_api.sign_solana_message.assert_called_once_with(
        address=test_address,
        sign_solana_message_request=SignSolanaMessageRequest(message=test_message),
        x_idempotency_key=test_idempotency_key,
    )

    assert result == mock_response


@pytest.mark.asyncio
async def test_sign_transaction():
    """Test signing a Solana transaction."""
    mock_solana_accounts_api = AsyncMock()
    mock_api_clients = AsyncMock()
    mock_api_clients.solana_accounts = mock_solana_accounts_api
    mock_response = SignSolanaTransactionResponse(signed_transaction="test_signed_transaction")
    mock_solana_accounts_api.sign_solana_transaction = AsyncMock(return_value=mock_response)

    client = SolanaClient(api_clients=mock_api_clients)

    test_address = "test_sol_address"
    test_transaction = "test_transaction"
    test_idempotency_key = "test-idempotency-key"

    result = await client.sign_transaction(
        address=test_address,
        transaction=test_transaction,
        idempotency_key=test_idempotency_key,
    )

    mock_solana_accounts_api.sign_solana_transaction.assert_called_once_with(
        address=test_address,
        sign_solana_transaction_request=SignSolanaTransactionRequest(transaction=test_transaction),
        x_idempotency_key=test_idempotency_key,
    )

    assert result == mock_response


@pytest.mark.asyncio
async def test_request_faucet():
    """Test requesting a Solana faucet."""
    mock_faucets_api = AsyncMock()
    mock_api_clients = AsyncMock()
    mock_api_clients.faucets = mock_faucets_api

    mock_response = RequestSolanaFaucetResponse(transaction_signature="solana_faucet_tx_hash")
    mock_faucets_api.request_solana_faucet = AsyncMock(return_value=mock_response)

    client = SolanaClient(api_clients=mock_api_clients)

    test_address = "14grJpemFaf88c8tiVb77W7TYg2W3ir6pfkKz3YjhhZ5"
    test_token = "sol"

    result = await client.request_faucet(
        address=test_address,
        token=test_token,
    )

    mock_faucets_api.request_solana_faucet.assert_called_once_with(
        request_solana_faucet_request=RequestSolanaFaucetRequest(
            address=test_address, token=test_token
        )
    )

    assert result == mock_response
