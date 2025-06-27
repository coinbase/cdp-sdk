from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from cdp.openapi_client.errors import ApiError
from cdp.openapi_client.models.create_solana_account_request import (
    CreateSolanaAccountRequest,
)
from cdp.openapi_client.models.export_evm_account_request import ExportEvmAccountRequest
from cdp.openapi_client.models.export_solana_account200_response import (
    ExportSolanaAccount200Response,
)
from cdp.openapi_client.models.import_solana_account_request import (
    ImportSolanaAccountRequest,
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
from cdp.openapi_client.models.solana_account import SolanaAccount as SolanaAccountModel
from cdp.openapi_client.models.update_solana_account_request import UpdateSolanaAccountRequest
from cdp.solana_client import SolanaClient
from cdp.update_account_types import UpdateAccountOptions


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

    assert result.address == mock_sol_account.address
    assert result.name == mock_sol_account.name


@pytest.mark.asyncio
async def test_create_account_with_policy():
    """Test creating a Solana account with a policy."""
    mock_solana_accounts_api = AsyncMock()
    mock_api_clients = AsyncMock()
    mock_api_clients.solana_accounts = mock_solana_accounts_api

    mock_sol_account = AsyncMock()
    mock_sol_account.address = "test_sol_address"
    mock_sol_account.name = "test-sol-account"
    mock_solana_accounts_api.create_solana_account = AsyncMock(return_value=mock_sol_account)

    client = SolanaClient(api_clients=mock_api_clients)

    test_name = "test-sol-account"
    test_account_policy = "abcdef12-3456-7890-1234-567890123456"
    test_idempotency_key = "test-idempotency-key"

    result = await client.create_account(
        name=test_name,
        account_policy=test_account_policy,
        idempotency_key=test_idempotency_key,
    )

    mock_solana_accounts_api.create_solana_account.assert_called_once_with(
        x_idempotency_key=test_idempotency_key,
        create_solana_account_request=CreateSolanaAccountRequest(
            name=test_name,
            account_policy=test_account_policy,
        ),
    )

    assert result.address == mock_sol_account.address
    assert result.name == mock_sol_account.name


@pytest.mark.asyncio
@patch("cdp.solana_client.generate_export_encryption_key_pair")
@patch("cdp.solana_client.decrypt_with_private_key")
@patch("cdp.solana_client.format_solana_private_key")
async def test_export_solana_account_by_address(
    mock_format_solana_private_key,
    mock_decrypt_with_private_key,
    mock_generate_export_encryption_key_pair,
):
    """Test exporting an Solana account by address."""
    test_address = "test_sol_address"

    test_public_key = "public_key"
    test_private_key = "private_key"
    mock_generate_export_encryption_key_pair.return_value = (test_public_key, test_private_key)

    test_decrypted_private_key = "decrypted_private_key"
    mock_decrypt_with_private_key.return_value = test_decrypted_private_key

    test_formatted_private_key = "formatted_private_key"
    mock_format_solana_private_key.return_value = test_formatted_private_key

    mock_solana_accounts_api = AsyncMock()
    mock_api_clients = AsyncMock()
    mock_api_clients.solana_accounts = mock_solana_accounts_api

    test_encrypted_private_key = "encrypted_private_key"
    mock_solana_accounts_api.export_solana_account = AsyncMock(
        return_value=ExportSolanaAccount200Response(
            encrypted_private_key=test_encrypted_private_key,
        )
    )

    client = SolanaClient(api_clients=mock_api_clients)

    result = await client.export_account(address=test_address)

    mock_generate_export_encryption_key_pair.assert_called_once()
    mock_solana_accounts_api.export_solana_account.assert_called_once_with(
        address=test_address,
        export_evm_account_request=ExportEvmAccountRequest(
            export_encryption_key=test_public_key,
        ),
        x_idempotency_key=None,
    )
    mock_decrypt_with_private_key.assert_called_once_with(
        test_private_key, test_encrypted_private_key
    )
    mock_format_solana_private_key.assert_called_once_with(test_decrypted_private_key)
    assert result == test_formatted_private_key


@pytest.mark.asyncio
@patch("cdp.solana_client.generate_export_encryption_key_pair")
@patch("cdp.solana_client.decrypt_with_private_key")
@patch("cdp.solana_client.format_solana_private_key")
async def test_export_solana_account_by_name(
    mock_format_solana_private_key,
    mock_decrypt_with_private_key,
    mock_generate_export_encryption_key_pair,
):
    """Test exporting an Solana account by name."""
    test_name = "test-account"
    test_public_key = "public_key"
    test_private_key = "private_key"
    mock_generate_export_encryption_key_pair.return_value = (test_public_key, test_private_key)

    test_decrypted_private_key = "decrypted_private_key"
    mock_decrypt_with_private_key.return_value = test_decrypted_private_key

    test_formatted_private_key = "formatted_private_key"
    mock_format_solana_private_key.return_value = test_formatted_private_key

    mock_solana_accounts_api = AsyncMock()
    mock_api_clients = AsyncMock()
    mock_api_clients.solana_accounts = mock_solana_accounts_api

    test_encrypted_private_key = "encrypted_private_key"
    mock_solana_accounts_api.export_solana_account_by_name = AsyncMock(
        return_value=ExportSolanaAccount200Response(
            encrypted_private_key=test_encrypted_private_key,
        )
    )

    client = SolanaClient(api_clients=mock_api_clients)

    result = await client.export_account(name=test_name)

    mock_generate_export_encryption_key_pair.assert_called_once()
    mock_solana_accounts_api.export_solana_account_by_name.assert_called_once_with(
        name=test_name,
        export_evm_account_request=ExportEvmAccountRequest(
            export_encryption_key=test_public_key,
        ),
        x_idempotency_key=None,
    )
    mock_decrypt_with_private_key.assert_called_once_with(
        test_private_key, test_encrypted_private_key
    )
    mock_format_solana_private_key.assert_called_once_with(test_decrypted_private_key)
    assert result == test_formatted_private_key


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

    assert result.address == mock_sol_account.address
    assert result.name == mock_sol_account.name


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

    mock_sol_account_1 = SolanaAccountModel(
        address="aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", name="test-sol-account-1"
    )
    mock_sol_account_2 = SolanaAccountModel(
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


@pytest.mark.asyncio
async def test_update_account(server_account_model_factory):
    """Test updating a Solana account."""
    mock_solana_accounts_api = AsyncMock()
    mock_api_clients = AsyncMock()
    mock_api_clients.solana_accounts = mock_solana_accounts_api

    sol_server_account_model = server_account_model_factory()
    mock_solana_accounts_api.update_solana_account = AsyncMock(
        return_value=sol_server_account_model
    )

    client = SolanaClient(api_clients=mock_api_clients)

    test_address = "test_sol_address"
    test_name = "updated-account-name"
    test_idempotency_key = "test-idempotency-key"
    test_account_policy = "8e03978e-40d5-43e8-bc93-6894a57f9324"

    update_options = UpdateAccountOptions(name=test_name, account_policy=test_account_policy)

    await client.update_account(
        address=test_address,
        update=update_options,
        idempotency_key=test_idempotency_key,
    )

    mock_solana_accounts_api.update_solana_account.assert_called_once_with(
        address=test_address,
        update_solana_account_request=UpdateSolanaAccountRequest(
            name=test_name,
            account_policy=test_account_policy,
        ),
        x_idempotency_key=test_idempotency_key,
    )


@pytest.mark.asyncio
@patch("cdp.solana_client.base64.b64encode")
@patch("cdp.solana_client.load_pem_public_key")
@patch("cdp.solana_client.base58.b58decode")
async def test_import_account(
    mock_b58decode,
    mock_load_pem_public_key,
    mock_b64encode,
):
    """Test importing a Solana account."""
    mock_solana_accounts_api = AsyncMock()
    mock_api_clients = AsyncMock()
    mock_api_clients.solana_accounts = mock_solana_accounts_api

    mock_sol_account = AsyncMock()
    mock_sol_account.address = "test_sol_address"
    mock_sol_account.name = "test-imported-account"
    mock_solana_accounts_api.import_solana_account = AsyncMock(return_value=mock_sol_account)

    client = SolanaClient(api_clients=mock_api_clients)

    test_private_key = "test_base58_private_key"
    test_name = "test-imported-account"
    test_idempotency_key = "test-idempotency-key"

    # Mock base58 decode to return valid 32-byte private key
    mock_b58decode.return_value = b"a" * 32

    # Mock RSA public key - use MagicMock not AsyncMock since encrypt is synchronous
    mock_public_key = MagicMock()
    mock_public_key.encrypt.return_value = b"encrypted_data"
    mock_load_pem_public_key.return_value = mock_public_key

    # Mock base64 encode
    mock_b64encode.return_value.decode.return_value = "encrypted_private_key_b64"

    result = await client.import_account(
        private_key=test_private_key,
        name=test_name,
        idempotency_key=test_idempotency_key,
    )

    mock_b58decode.assert_called_once_with(test_private_key)
    mock_load_pem_public_key.assert_called_once()
    mock_public_key.encrypt.assert_called_once()
    mock_b64encode.assert_called_once_with(b"encrypted_data")
    mock_solana_accounts_api.import_solana_account.assert_called_once_with(
        import_solana_account_request=ImportSolanaAccountRequest(
            encrypted_private_key="encrypted_private_key_b64",
            name=test_name,
        ),
        x_idempotency_key=test_idempotency_key,
    )

    assert result.address == mock_sol_account.address
    assert result.name == mock_sol_account.name


@pytest.mark.asyncio
@patch("cdp.solana_client.base64.b64encode")
@patch("cdp.solana_client.load_pem_public_key")
@patch("cdp.solana_client.base58.b58decode")
async def test_import_account_with_64_byte_key(
    mock_b58decode,
    mock_load_pem_public_key,
    mock_b64encode,
):
    """Test importing a Solana account with a 64-byte private key."""
    mock_solana_accounts_api = AsyncMock()
    mock_api_clients = AsyncMock()
    mock_api_clients.solana_accounts = mock_solana_accounts_api

    mock_sol_account = AsyncMock()
    mock_sol_account.address = "test_sol_address"
    mock_sol_account.name = "test-imported-account"
    mock_solana_accounts_api.import_solana_account = AsyncMock(return_value=mock_sol_account)

    client = SolanaClient(api_clients=mock_api_clients)

    test_private_key = "test_base58_private_key"
    test_name = "test-imported-account"

    # Mock base58 decode to return valid 64-byte private key (should be truncated to 32)
    mock_b58decode.return_value = b"a" * 64

    # Mock RSA public key - use MagicMock not AsyncMock since encrypt is synchronous
    mock_public_key = MagicMock()
    mock_public_key.encrypt.return_value = b"encrypted_data"
    mock_load_pem_public_key.return_value = mock_public_key

    # Mock base64 encode
    mock_b64encode.return_value.decode.return_value = "encrypted_private_key_b64"

    result = await client.import_account(
        private_key=test_private_key,
        name=test_name,
    )

    mock_b58decode.assert_called_once_with(test_private_key)
    # Verify that the encryption was called with the first 32 bytes
    mock_public_key.encrypt.assert_called_once()
    encrypted_data = mock_public_key.encrypt.call_args[0][0]
    assert len(encrypted_data) == 32

    assert result.address == mock_sol_account.address
    assert result.name == mock_sol_account.name


@pytest.mark.asyncio
@patch("cdp.solana_client.base58.b58decode")
async def test_import_account_invalid_private_key(mock_b58decode):
    """Test importing a Solana account with invalid private key."""
    mock_api_clients = AsyncMock()
    client = SolanaClient(api_clients=mock_api_clients)

    # Test with invalid base58 string
    mock_b58decode.side_effect = Exception("Invalid base58")
    with pytest.raises(ValueError, match="Private key must be a valid base58 encoded string"):
        await client.import_account(private_key="invalid_base58")

    # Test with valid base58 but wrong length
    mock_b58decode.side_effect = None
    mock_b58decode.return_value = b"a" * 16  # Invalid length

    with pytest.raises(ValueError, match="Private key must be 32 or 64 bytes"):
        await client.import_account(private_key="test_key")
