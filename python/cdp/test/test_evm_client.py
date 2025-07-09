import base64
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from eth_account.typed_transactions import DynamicFeeTransaction
from web3 import Web3

from cdp.api_clients import ApiClients
from cdp.constants import ImportAccountPublicRSAKey
from cdp.evm_client import EvmClient
from cdp.evm_token_balances import (
    EvmToken,
    EvmTokenAmount,
    EvmTokenBalance,
    ListTokenBalancesResult,
)
from cdp.evm_transaction_types import TransactionRequestEIP1559
from cdp.openapi_client.cdp_api_client import CdpApiClient
from cdp.openapi_client.errors import ApiError
from cdp.openapi_client.models.create_evm_account_request import CreateEvmAccountRequest
from cdp.openapi_client.models.create_evm_smart_account_request import (
    CreateEvmSmartAccountRequest,
)
from cdp.openapi_client.models.eip712_domain import EIP712Domain
from cdp.openapi_client.models.eip712_message import EIP712Message
from cdp.openapi_client.models.export_evm_account200_response import ExportEvmAccount200Response
from cdp.openapi_client.models.export_evm_account_request import ExportEvmAccountRequest
from cdp.openapi_client.models.import_evm_account_request import ImportEvmAccountRequest
from cdp.openapi_client.models.request_evm_faucet_request import RequestEvmFaucetRequest
from cdp.openapi_client.models.send_evm_transaction200_response import SendEvmTransaction200Response
from cdp.openapi_client.models.send_evm_transaction_request import SendEvmTransactionRequest
from cdp.openapi_client.models.sign_evm_hash_request import SignEvmHashRequest
from cdp.openapi_client.models.sign_evm_message_request import SignEvmMessageRequest
from cdp.openapi_client.models.sign_evm_transaction_request import (
    SignEvmTransactionRequest,
)
from cdp.openapi_client.models.sign_evm_typed_data200_response import SignEvmTypedData200Response
from cdp.openapi_client.models.update_evm_account_request import UpdateEvmAccountRequest
from cdp.openapi_client.models.update_evm_smart_account_request import UpdateEvmSmartAccountRequest
from cdp.update_account_types import UpdateAccountOptions
from cdp.update_smart_account_types import UpdateSmartAccountOptions


def test_init():
    """Test the initialization of the EvmClient."""
    client = EvmClient(
        api_clients=ApiClients(
            CdpApiClient(
                api_key_id="test_api_key_id",
                api_key_secret="test_api_key_secret",
                wallet_secret="test_wallet_secret",
            )
        )
    )

    assert client.api_clients._cdp_client.api_key_id == "test_api_key_id"
    assert client.api_clients._cdp_client.api_key_secret == "test_api_key_secret"
    assert client.api_clients._cdp_client.wallet_secret == "test_wallet_secret"
    assert hasattr(client, "api_clients")


@pytest.mark.asyncio
async def test_create_account(server_account_model_factory):
    """Test creating an EVM account."""
    evm_server_account_model = server_account_model_factory()
    mock_evm_accounts_api = AsyncMock()
    mock_api_clients = AsyncMock()
    mock_api_clients.evm_accounts = mock_evm_accounts_api
    mock_evm_accounts_api.create_evm_account = AsyncMock(return_value=evm_server_account_model)

    client = EvmClient(api_clients=mock_api_clients)

    test_name = "test-account"
    test_idempotency_key = "65514b9d-ffa1-4d46-ac59-ac88b5f651ae"

    result = await client.create_account(name=test_name, idempotency_key=test_idempotency_key)

    mock_evm_accounts_api.create_evm_account.assert_called_once_with(
        x_idempotency_key=test_idempotency_key,
        create_evm_account_request=CreateEvmAccountRequest(name=test_name),
    )

    assert result.address == evm_server_account_model.address
    assert result.name == evm_server_account_model.name


@pytest.mark.asyncio
async def test_create_account_with_policy(server_account_model_factory):
    """Test creating an EVM account with a policy."""
    evm_server_account_model = server_account_model_factory()
    mock_evm_accounts_api = AsyncMock()
    mock_api_clients = AsyncMock()
    mock_api_clients.evm_accounts = mock_evm_accounts_api
    mock_evm_accounts_api.create_evm_account = AsyncMock(return_value=evm_server_account_model)

    client = EvmClient(api_clients=mock_api_clients)

    test_name = "test-account"
    test_account_policy = "abcdef12-3456-7890-1234-567890123456"
    test_idempotency_key = "65514b9d-ffa1-4d46-ac59-ac88b5f651ae"

    result = await client.create_account(
        name=test_name,
        account_policy=test_account_policy,
        idempotency_key=test_idempotency_key,
    )

    mock_evm_accounts_api.create_evm_account.assert_called_once_with(
        x_idempotency_key=test_idempotency_key,
        create_evm_account_request=CreateEvmAccountRequest(
            name=test_name,
            account_policy=test_account_policy,
        ),
    )

    assert result.address == evm_server_account_model.address
    assert result.name == evm_server_account_model.name


@pytest.mark.asyncio
@patch("cdp.evm_client.load_pem_public_key")
@patch("cdp.evm_client.padding")
@patch("cdp.evm_client.hashes")
async def test_import_account(
    mock_hashes, mock_padding, mock_load_pem_public_key, server_account_model_factory
):
    """Test importing an EVM account."""
    # Create mock objects for padding and hashes
    mock_sha256 = MagicMock()
    mock_hashes.SHA256.return_value = mock_sha256
    mock_mgf1 = MagicMock()
    mock_mgf1.algorithm = mock_sha256
    mock_oaep = MagicMock()
    mock_oaep.mgf = mock_mgf1
    mock_oaep.algorithm = mock_sha256
    mock_oaep.label = None

    # Set up the padding mock to return our mock OAEP
    mock_padding.OAEP.return_value = mock_oaep
    mock_padding.MGF1.return_value = mock_mgf1

    # Mock the public key and encryption
    test_encrypted_private_key = b"encrypted_private_key"
    mock_public_key = MagicMock()
    mock_public_key.encrypt.return_value = test_encrypted_private_key
    mock_load_pem_public_key.return_value = mock_public_key

    evm_server_account_model = server_account_model_factory()
    mock_evm_accounts_api = AsyncMock()
    mock_api_clients = AsyncMock()
    mock_api_clients.evm_accounts = mock_evm_accounts_api
    mock_evm_accounts_api.import_evm_account = AsyncMock(return_value=evm_server_account_model)

    client = EvmClient(api_clients=mock_api_clients)

    test_private_key = "0x1234567890123456789012345678901234567890123456789012345678901234"
    test_private_key_bytes = bytes.fromhex(test_private_key[2:])
    test_name = "test-account"
    test_idempotency_key = "65514b9d-ffa1-4d46-ac59-ac88b5f651ae"

    result = await client.import_account(
        private_key=test_private_key,
        name=test_name,
        idempotency_key=test_idempotency_key,
    )

    # Verify the encryption was called with correct parameters
    mock_load_pem_public_key.assert_called_once_with(ImportAccountPublicRSAKey.encode())
    mock_public_key.encrypt.assert_called_once_with(
        test_private_key_bytes,
        mock_oaep,
    )

    # Verify the padding was set up correctly
    mock_padding.OAEP.assert_called_once_with(mgf=mock_mgf1, algorithm=mock_sha256, label=None)
    mock_padding.MGF1.assert_called_once_with(algorithm=mock_sha256)

    # Verify the API call was made with base64 encoded encrypted key
    test_encrypted_private_key_base64 = base64.b64encode(test_encrypted_private_key).decode("utf-8")
    mock_evm_accounts_api.import_evm_account.assert_called_once_with(
        import_evm_account_request=ImportEvmAccountRequest(
            encrypted_private_key=test_encrypted_private_key_base64,
            name=test_name,
        ),
        x_idempotency_key=test_idempotency_key,
    )

    assert result.address == evm_server_account_model.address
    assert result.name == evm_server_account_model.name


@pytest.mark.asyncio
@patch("cdp.evm_client.load_pem_public_key")
@patch("cdp.evm_client.padding")
@patch("cdp.evm_client.hashes")
async def test_import_account_without_0x_prefix(
    mock_hashes, mock_padding, mock_load_pem_public_key, server_account_model_factory
):
    """Test importing an EVM account with private key without 0x prefix."""
    # Create mock objects for padding and hashes
    mock_sha256 = MagicMock()
    mock_hashes.SHA256.return_value = mock_sha256
    mock_mgf1 = MagicMock()
    mock_mgf1.algorithm = mock_sha256
    mock_oaep = MagicMock()
    mock_oaep.mgf = mock_mgf1
    mock_oaep.algorithm = mock_sha256
    mock_oaep.label = None

    # Set up the padding mock to return our mock OAEP
    mock_padding.OAEP.return_value = mock_oaep
    mock_padding.MGF1.return_value = mock_mgf1

    # Mock the public key and encryption
    test_encrypted_private_key = b"encrypted_private_key"
    mock_public_key = MagicMock()
    mock_public_key.encrypt.return_value = test_encrypted_private_key
    mock_load_pem_public_key.return_value = mock_public_key

    evm_server_account_model = server_account_model_factory()
    mock_evm_accounts_api = AsyncMock()
    mock_api_clients = AsyncMock()
    mock_api_clients.evm_accounts = mock_evm_accounts_api
    mock_evm_accounts_api.import_evm_account = AsyncMock(return_value=evm_server_account_model)

    client = EvmClient(api_clients=mock_api_clients)

    # Private key without 0x prefix
    test_private_key = "1234567890123456789012345678901234567890123456789012345678901234"
    test_private_key_bytes = bytes.fromhex(test_private_key)
    test_name = "test-account"
    test_idempotency_key = "65514b9d-ffa1-4d46-ac59-ac88b5f651ae"

    result = await client.import_account(
        private_key=test_private_key,
        name=test_name,
        idempotency_key=test_idempotency_key,
    )

    # Verify the encryption was called with correct parameters
    mock_load_pem_public_key.assert_called_once_with(ImportAccountPublicRSAKey.encode())
    mock_public_key.encrypt.assert_called_once_with(
        test_private_key_bytes,
        mock_oaep,
    )

    # Verify the padding was set up correctly
    mock_padding.OAEP.assert_called_once_with(mgf=mock_mgf1, algorithm=mock_sha256, label=None)
    mock_padding.MGF1.assert_called_once_with(algorithm=mock_sha256)

    # Verify the API call was made with base64 encoded encrypted key
    test_encrypted_private_key_base64 = base64.b64encode(test_encrypted_private_key).decode("utf-8")
    mock_evm_accounts_api.import_evm_account.assert_called_once_with(
        import_evm_account_request=ImportEvmAccountRequest(
            encrypted_private_key=test_encrypted_private_key_base64,
            name=test_name,
        ),
        x_idempotency_key=test_idempotency_key,
    )

    assert result.address == evm_server_account_model.address
    assert result.name == evm_server_account_model.name


@pytest.mark.asyncio
async def test_import_account_invalid_private_key():
    """Test importing an EVM account with invalid private key."""
    client = EvmClient(api_clients=AsyncMock())

    # Test with non-hex characters
    with pytest.raises(ValueError, match="Private key must be a valid hexadecimal string"):
        await client.import_account(
            private_key="0xnot-a-valid-hex-string",
            name="test-account",
        )

    # Test with empty string
    with pytest.raises(ValueError, match="Private key must be a valid hexadecimal string"):
        await client.import_account(
            private_key="",
            name="test-account",
        )

    # Test with invalid hex characters
    with pytest.raises(ValueError, match="Private key must be a valid hexadecimal string"):
        await client.import_account(
            private_key="0x123456789012345678901234567890123456789012345678901234567890123g",
            name="test-account",
        )


@pytest.mark.asyncio
@patch("cdp.evm_client.generate_export_encryption_key_pair")
@patch("cdp.evm_client.decrypt_with_private_key")
async def test_export_evm_account_by_address(
    mock_decrypt_with_private_key,
    mock_generate_export_encryption_key_pair,
):
    """Test exporting an EVM account by address."""
    test_address = "0x1234567890123456789012345678901234567890"

    test_public_key = "public_key"
    test_private_key = "private_key"
    mock_generate_export_encryption_key_pair.return_value = (test_public_key, test_private_key)

    test_decrypted_private_key = "decrypted_private_key"
    mock_decrypt_with_private_key.return_value = test_decrypted_private_key

    mock_evm_accounts_api = AsyncMock()
    mock_api_clients = AsyncMock()
    mock_api_clients.evm_accounts = mock_evm_accounts_api

    test_encrypted_private_key = "encrypted_private_key"
    mock_evm_accounts_api.export_evm_account = AsyncMock(
        return_value=ExportEvmAccount200Response(
            encrypted_private_key=test_encrypted_private_key,
        )
    )

    client = EvmClient(api_clients=mock_api_clients)

    result = await client.export_account(address=test_address)

    mock_generate_export_encryption_key_pair.assert_called_once()
    mock_evm_accounts_api.export_evm_account.assert_called_once_with(
        address=test_address,
        export_evm_account_request=ExportEvmAccountRequest(
            export_encryption_key=test_public_key,
        ),
        x_idempotency_key=None,
    )
    mock_decrypt_with_private_key.assert_called_once_with(
        test_private_key, test_encrypted_private_key
    )
    assert result == test_decrypted_private_key


@pytest.mark.asyncio
@patch("cdp.evm_client.generate_export_encryption_key_pair")
@patch("cdp.evm_client.decrypt_with_private_key")
async def test_export_evm_account_by_name(
    mock_decrypt_with_private_key,
    mock_generate_export_encryption_key_pair,
):
    """Test exporting an EVM account by name."""
    test_name = "test-account"
    test_public_key = "public_key"
    test_private_key = "private_key"
    mock_generate_export_encryption_key_pair.return_value = (test_public_key, test_private_key)

    test_decrypted_private_key = "decrypted_private_key"
    mock_decrypt_with_private_key.return_value = test_decrypted_private_key

    mock_evm_accounts_api = AsyncMock()
    mock_api_clients = AsyncMock()
    mock_api_clients.evm_accounts = mock_evm_accounts_api

    test_encrypted_private_key = "encrypted_private_key"
    mock_evm_accounts_api.export_evm_account_by_name = AsyncMock(
        return_value=ExportEvmAccount200Response(
            encrypted_private_key=test_encrypted_private_key,
        )
    )

    client = EvmClient(api_clients=mock_api_clients)

    result = await client.export_account(name=test_name)

    mock_generate_export_encryption_key_pair.assert_called_once()
    mock_evm_accounts_api.export_evm_account_by_name.assert_called_once_with(
        name=test_name,
        export_evm_account_request=ExportEvmAccountRequest(
            export_encryption_key=test_public_key,
        ),
        x_idempotency_key=None,
    )
    mock_decrypt_with_private_key.assert_called_once_with(
        test_private_key, test_encrypted_private_key
    )
    assert result == test_decrypted_private_key


@pytest.mark.asyncio
async def test_list_accounts(server_account_model_factory):
    """Test listing EVM accounts."""
    mock_evm_accounts_api = AsyncMock()
    mock_api_clients = AsyncMock()
    mock_api_clients.evm_accounts = mock_evm_accounts_api

    evm_server_account_model_1 = server_account_model_factory(
        address="0x1234567890123456789012345678901234567890", name="test-account-1"
    )
    evm_server_account_model_2 = server_account_model_factory(
        address="0x2345678901234567890123456789012345678901", name="test-account-2"
    )

    mock_response = AsyncMock()
    mock_response.accounts = [evm_server_account_model_1, evm_server_account_model_2]
    mock_response.next_page_token = "next-page-token"
    mock_evm_accounts_api.list_evm_accounts = AsyncMock(return_value=mock_response)

    client = EvmClient(api_clients=mock_api_clients)

    result = await client.list_accounts()

    mock_evm_accounts_api.list_evm_accounts.assert_called_once_with(page_size=None, page_token=None)

    assert len(result.accounts) == 2
    assert result.accounts[0].address == evm_server_account_model_1.address
    assert result.accounts[0].name == evm_server_account_model_1.name
    assert result.accounts[1].address == evm_server_account_model_2.address
    assert result.accounts[1].name == evm_server_account_model_2.name
    assert result.next_page_token == "next-page-token"


@pytest.mark.asyncio
async def test_get_account(server_account_model_factory):
    """Test getting an EVM account by address."""
    mock_evm_accounts_api = AsyncMock()
    mock_api_clients = AsyncMock()
    mock_api_clients.evm_accounts = mock_evm_accounts_api

    evm_server_account_model = server_account_model_factory()
    mock_evm_accounts_api.get_evm_account = AsyncMock(return_value=evm_server_account_model)

    client = EvmClient(api_clients=mock_api_clients)

    test_address = "0x1234567890123456789012345678901234567890"
    result = await client.get_account(address=test_address)

    mock_evm_accounts_api.get_evm_account.assert_called_once_with(test_address)

    assert result.address == evm_server_account_model.address
    assert result.name == evm_server_account_model.name


@pytest.mark.asyncio
async def test_get_account_by_name(server_account_model_factory):
    """Test getting an EVM account by name."""
    mock_evm_accounts_api = AsyncMock()
    mock_api_clients = AsyncMock()
    mock_api_clients.evm_accounts = mock_evm_accounts_api

    evm_server_account_model = server_account_model_factory()
    mock_evm_accounts_api.get_evm_account_by_name = AsyncMock(return_value=evm_server_account_model)

    client = EvmClient(api_clients=mock_api_clients)

    test_name = "test-account"
    result = await client.get_account(name=test_name)

    mock_evm_accounts_api.get_evm_account_by_name.assert_called_once_with(test_name)

    assert result.address == evm_server_account_model.address
    assert result.name == evm_server_account_model.name


@pytest.mark.asyncio
async def test_get_account_throws_error_if_neither_address_nor_name_is_provided():
    """Test that the get_account method throws an error if neither address nor name is provided."""
    client = EvmClient(api_clients=AsyncMock())
    with pytest.raises(ValueError):
        await client.get_account()


@pytest.mark.asyncio
async def test_get_or_create_account(server_account_model_factory):
    """Test getting or creating an EVM account."""
    mock_evm_accounts_api = AsyncMock()
    mock_api_clients = AsyncMock()
    mock_api_clients.evm_accounts = mock_evm_accounts_api

    evm_server_account_model = server_account_model_factory()
    client = EvmClient(api_clients=mock_api_clients)

    mock_evm_accounts_api.get_evm_account_by_name = AsyncMock(
        side_effect=[
            ApiError(404, "not_found", "Account not found"),
            evm_server_account_model,
        ]
    )

    mock_evm_accounts_api.create_evm_account = AsyncMock(return_value=evm_server_account_model)

    test_name = "test-account"
    result = await client.get_or_create_account(name=test_name)
    result2 = await client.get_or_create_account(name=test_name)

    assert mock_evm_accounts_api.get_evm_account_by_name.call_count == 2
    mock_evm_accounts_api.create_evm_account.assert_called_once_with(
        x_idempotency_key=None,
        create_evm_account_request=CreateEvmAccountRequest(name=test_name),
    )

    assert result.address == evm_server_account_model.address
    assert result.name == evm_server_account_model.name
    assert result2.address == evm_server_account_model.address
    assert result2.name == evm_server_account_model.name


@pytest.mark.asyncio
async def test_create_smart_account(smart_account_model_factory):
    """Test creating an EVM smart account."""
    mock_evm_smart_accounts_api = AsyncMock()
    mock_api_clients = AsyncMock()
    mock_api_clients.evm_smart_accounts = mock_evm_smart_accounts_api
    evm_smart_account_model = smart_account_model_factory()
    mock_evm_smart_accounts_api.create_evm_smart_account = AsyncMock(
        return_value=evm_smart_account_model
    )

    client = EvmClient(api_clients=mock_api_clients)

    result = await client.create_smart_account(evm_smart_account_model)

    mock_evm_smart_accounts_api.create_evm_smart_account.assert_called_once_with(
        create_evm_smart_account_request=CreateEvmSmartAccountRequest(
            owners=[evm_smart_account_model.address]
        )
    )

    assert result.address == evm_smart_account_model.address
    assert result.name == evm_smart_account_model.name


@pytest.mark.asyncio
async def test_get_or_create_smart_account(smart_account_model_factory, local_account_factory):
    """Test getting or creating an EVM smart account."""
    mock_evm_smart_accounts_api = AsyncMock()
    mock_api_clients = AsyncMock()
    mock_api_clients.evm_smart_accounts = mock_evm_smart_accounts_api
    client = EvmClient(api_clients=mock_api_clients)

    smart_account_model = smart_account_model_factory()
    mock_evm_smart_accounts_api.get_evm_smart_account_by_name = AsyncMock(
        side_effect=[
            ApiError(404, "not_found", "Account not found"),
            smart_account_model,
        ]
    )
    mock_evm_smart_accounts_api.create_evm_smart_account = AsyncMock(
        return_value=smart_account_model
    )

    test_name = "test-account"
    owner = local_account_factory()
    result = await client.get_or_create_smart_account(name=test_name, owner=owner)
    result2 = await client.get_or_create_smart_account(name=test_name, owner=owner)

    assert mock_evm_smart_accounts_api.get_evm_smart_account_by_name.call_count == 2
    mock_evm_smart_accounts_api.create_evm_smart_account.assert_called_once_with(
        create_evm_smart_account_request=CreateEvmSmartAccountRequest(
            owners=[owner.address], name=test_name
        )
    )

    assert result.address == smart_account_model.address
    assert result.name == smart_account_model.name
    assert result2.address == smart_account_model.address
    assert result2.name == smart_account_model.name


@pytest.mark.asyncio
@patch("cdp.evm_client.send_user_operation")
async def test_send_user_operation(mock_send_user_operation, smart_account_model_factory):
    """Test sending a user operation for a smart account."""
    mock_evm_smart_accounts_api = AsyncMock()
    mock_api_clients = AsyncMock()
    mock_api_clients.evm_smart_accounts = mock_evm_smart_accounts_api
    client = EvmClient(api_clients=mock_api_clients)

    smart_account_model = smart_account_model_factory()
    mock_calls = [{"to": "0x123", "data": "0xabcdef"}]
    test_network = "ethereum"
    test_paymaster_url = "https://paymaster.example.com"

    mock_user_operation = {"hash": "0x456", "sender": smart_account_model.address}
    mock_send_user_operation.return_value = mock_user_operation

    result = await client.send_user_operation(
        smart_account=smart_account_model,
        calls=mock_calls,
        network=test_network,
        paymaster_url=test_paymaster_url,
    )

    mock_send_user_operation.assert_called_once_with(
        client.api_clients,
        smart_account_model.address,
        smart_account_model.owners[0],
        mock_calls,
        test_network,
        test_paymaster_url,
    )

    assert result == mock_user_operation


@pytest.mark.asyncio
async def test_send_transaction_serialized():
    """Test sending a serialized transaction."""
    mock_evm_accounts_api = AsyncMock()
    mock_api_clients = AsyncMock()
    mock_api_clients.evm_accounts = mock_evm_accounts_api
    mock_evm_accounts_api.send_evm_transaction = AsyncMock(
        return_value=SendEvmTransaction200Response(transaction_hash="0x123")
    )
    client = EvmClient(api_clients=mock_api_clients)

    test_address = "0x1234567890123456789012345678901234567890"
    test_network = "base-sepolia"
    test_transaction = "0xabcdef"

    result = await client.send_transaction(
        address=test_address, network=test_network, transaction=test_transaction
    )

    mock_evm_accounts_api.send_evm_transaction.assert_called_once_with(
        address=test_address,
        send_evm_transaction_request=SendEvmTransactionRequest(
            transaction=test_transaction, network=test_network
        ),
        x_idempotency_key=None,
    )

    assert result == "0x123"


@pytest.mark.asyncio
async def test_send_transaction_eip1559():
    """Test sending an EIP-1559 transaction."""
    mock_evm_accounts_api = AsyncMock()
    mock_api_clients = AsyncMock()
    mock_api_clients.evm_accounts = mock_evm_accounts_api
    mock_evm_accounts_api.send_evm_transaction = AsyncMock(
        return_value=SendEvmTransaction200Response(transaction_hash="0x123")
    )
    client = EvmClient(api_clients=mock_api_clients)

    w3 = Web3()

    test_address = "0x1234567890123456789012345678901234567890"
    test_network = "base-sepolia"
    test_transaction = TransactionRequestEIP1559(
        to="0x1234567890123456789012345678901234567890",
        value=w3.to_wei(0.000001, "ether"),
    )

    result = await client.send_transaction(
        address=test_address, network=test_network, transaction=test_transaction
    )

    mock_evm_accounts_api.send_evm_transaction.assert_called_once_with(
        address=test_address,
        send_evm_transaction_request=SendEvmTransactionRequest(
            transaction="0x02e5808080808094123456789012345678901234567890123456789085e8d4a5100080c0808080",
            network=test_network,
        ),
        x_idempotency_key=None,
    )

    assert result == "0x123"


@pytest.mark.asyncio
async def test_send_transaction_dynamic_fee():
    """Test sending a dynamic fee transaction."""
    mock_evm_accounts_api = AsyncMock()
    mock_api_clients = AsyncMock()
    mock_api_clients.evm_accounts = mock_evm_accounts_api
    mock_evm_accounts_api.send_evm_transaction = AsyncMock(
        return_value=SendEvmTransaction200Response(transaction_hash="0x123")
    )
    client = EvmClient(api_clients=mock_api_clients)

    w3 = Web3()

    test_address = "0x1234567890123456789012345678901234567890"
    test_network = "base-sepolia"
    test_transaction = DynamicFeeTransaction.from_dict(
        {
            "to": "0x1234567890123456789012345678901234567890",
            "value": w3.to_wei(0.000001, "ether"),
            "gas": 21000,
            "maxFeePerGas": 1000000000000000000,
            "maxPriorityFeePerGas": 1000000000000000000,
            "nonce": 1,
            "type": "0x2",
        }
    )

    result = await client.send_transaction(
        address=test_address, network=test_network, transaction=test_transaction
    )

    mock_evm_accounts_api.send_evm_transaction.assert_called_once_with(
        address=test_address,
        send_evm_transaction_request=SendEvmTransactionRequest(
            transaction="0x02f78001880de0b6b3a7640000880de0b6b3a764000082520894123456789012345678901234567890123456789085e8d4a5100080c0808080",
            network=test_network,
        ),
        x_idempotency_key=None,
    )

    assert result == "0x123"


@pytest.mark.asyncio
@patch("cdp.evm_client.wait_for_user_operation")
async def test_wait_for_user_operation(mock_wait_for_user_operation, smart_account_model_factory):
    """Test waiting for a user operation."""
    mock_evm_smart_accounts_api = AsyncMock()
    mock_api_clients = AsyncMock()
    mock_api_clients.evm_smart_accounts = mock_evm_smart_accounts_api
    client = EvmClient(api_clients=mock_api_clients)

    smart_account_model = smart_account_model_factory()
    mock_user_operation = {"hash": "0x456", "sender": smart_account_model.address}
    mock_wait_result = {"receipt": {"blockHash": "0x789"}}

    mock_wait_for_user_operation.return_value = mock_wait_result

    result = await client.wait_for_user_operation(
        smart_account_address=smart_account_model.address,
        user_op_hash=mock_user_operation["hash"],
        timeout_seconds=30,
        interval_seconds=0.5,
    )

    mock_wait_for_user_operation.assert_called_once_with(
        client.api_clients,
        smart_account_model.address,
        mock_user_operation["hash"],
        30,
        0.5,
    )

    assert result == mock_wait_result


@pytest.mark.asyncio
async def test_sign_hash():
    """Test signing an EVM hash."""
    mock_evm_accounts_api = AsyncMock()
    mock_api_clients = AsyncMock()
    mock_api_clients.evm_accounts = mock_evm_accounts_api
    mock_response = AsyncMock()
    mock_response.signature = "0x123"
    mock_evm_accounts_api.sign_evm_hash = AsyncMock(return_value=mock_response)
    client = EvmClient(api_clients=mock_api_clients)
    test_address = "0x1234567890123456789012345678901234567890"
    test_hash = "0xabcdef"
    test_idempotency_key = "test-idempotency-key"

    result = await client.sign_hash(
        address=test_address, hash=test_hash, idempotency_key=test_idempotency_key
    )

    mock_evm_accounts_api.sign_evm_hash.assert_called_once_with(
        address=test_address,
        sign_evm_hash_request=SignEvmHashRequest(hash=test_hash),
        x_idempotency_key=test_idempotency_key,
    )

    assert result == "0x123"


@pytest.mark.asyncio
async def test_sign_message():
    """Test signing an EVM message."""
    mock_evm_accounts_api = AsyncMock()
    mock_api_clients = AsyncMock()
    mock_api_clients.evm_accounts = mock_evm_accounts_api
    mock_response = AsyncMock()
    mock_response.signature = "0x123"
    mock_evm_accounts_api.sign_evm_message = AsyncMock(return_value=mock_response)
    client = EvmClient(api_clients=mock_api_clients)
    test_address = "0x1234567890123456789012345678901234567890"
    test_message = "0xabcdef"
    test_idempotency_key = "test-idempotency-key"

    result = await client.sign_message(
        address=test_address, message=test_message, idempotency_key=test_idempotency_key
    )

    mock_evm_accounts_api.sign_evm_message.assert_called_once_with(
        address=test_address,
        sign_evm_message_request=SignEvmMessageRequest(message=test_message),
        x_idempotency_key=test_idempotency_key,
    )

    assert result == "0x123"


@pytest.mark.asyncio
async def test_sign_typed_data():
    """Test signing an EVM typed data."""
    mock_evm_accounts_api = AsyncMock()
    mock_api_clients = AsyncMock()
    mock_api_clients.evm_accounts = mock_evm_accounts_api

    test_address = "0x1234567890123456789012345678901234567890"
    domain = EIP712Domain(
        name="Test",
        chain_id=1,
        verifying_contract="0x0000000000000000000000000000000000000000",
    )
    types = {
        "EIP712Domain": [
            {"name": "name", "type": "string"},
            {"name": "chainId", "type": "uint256"},
            {"name": "verifyingContract", "type": "address"},
        ],
    }
    primary_type = "EIP712Domain"
    message = {
        "name": "EIP712Domain",
        "chainId": 1,
        "verifyingContract": "0x0000000000000000000000000000000000000000",
    }
    test_idempotency_key = "test-idempotency-key"

    mock_evm_accounts_api.sign_evm_typed_data = AsyncMock(
        return_value=SignEvmTypedData200Response(signature="0x123")
    )

    client = EvmClient(api_clients=mock_api_clients)

    result = await client.sign_typed_data(
        address=test_address,
        domain=domain,
        types=types,
        primary_type=primary_type,
        message=message,
        idempotency_key=test_idempotency_key,
    )

    mock_evm_accounts_api.sign_evm_typed_data.assert_called_once_with(
        address=test_address,
        eip712_message=EIP712Message(
            domain=domain,
            types=types,
            primary_type=primary_type,
            message=message,
        ),
        x_idempotency_key=test_idempotency_key,
    )

    assert result == "0x123"


@pytest.mark.asyncio
async def test_sign_transaction():
    """Test signing an EVM transaction."""
    mock_evm_accounts_api = AsyncMock()
    mock_api_clients = AsyncMock()
    mock_api_clients.evm_accounts = mock_evm_accounts_api
    mock_response = AsyncMock()
    mock_response.signed_transaction = "0x123"
    mock_evm_accounts_api.sign_evm_transaction = AsyncMock(return_value=mock_response)
    client = EvmClient(api_clients=mock_api_clients)
    test_address = "0x1234567890123456789012345678901234567890"
    test_transaction = "0xabcdef"
    test_idempotency_key = "test-idempotency-key"

    result = await client.sign_transaction(
        address=test_address,
        transaction=test_transaction,
        idempotency_key=test_idempotency_key,
    )

    mock_evm_accounts_api.sign_evm_transaction.assert_called_once_with(
        address=test_address,
        sign_evm_transaction_request=SignEvmTransactionRequest(transaction=test_transaction),
        x_idempotency_key=test_idempotency_key,
    )

    assert result == "0x123"


@pytest.mark.asyncio
async def test_request_faucet():
    """Test requesting an EVM faucet."""
    mock_faucets_api = AsyncMock()
    mock_api_clients = AsyncMock()
    mock_api_clients.faucets = mock_faucets_api

    mock_response = AsyncMock()
    mock_response.transaction_hash = "0xfaucet_tx_hash"
    mock_faucets_api.request_evm_faucet = AsyncMock(return_value=mock_response)

    client = EvmClient(api_clients=mock_api_clients)

    test_address = "0x1234567890123456789012345678901234567890"
    test_network = "base-sepolia"
    test_token = "eth"
    result = await client.request_faucet(
        address=test_address,
        network=test_network,
        token=test_token,
    )

    mock_faucets_api.request_evm_faucet.assert_called_once_with(
        request_evm_faucet_request=RequestEvmFaucetRequest(
            address=test_address, network=test_network, token=test_token
        )
    )

    assert result == "0xfaucet_tx_hash"


@pytest.mark.asyncio
async def test_update_account(server_account_model_factory):
    """Test updating an EVM account."""
    mock_evm_accounts_api = AsyncMock()
    mock_api_clients = AsyncMock()
    mock_api_clients.evm_accounts = mock_evm_accounts_api

    evm_server_account_model = server_account_model_factory()
    mock_evm_accounts_api.update_evm_account = AsyncMock(return_value=evm_server_account_model)

    client = EvmClient(api_clients=mock_api_clients)

    test_address = "0x1234567890123456789012345678901234567890"
    test_name = "updated-account-name"
    test_idempotency_key = "test-idempotency-key"
    test_account_policy = "8e03978e-40d5-43e8-bc93-6894a57f9324"
    update_options = UpdateAccountOptions(name=test_name, account_policy=test_account_policy)

    await client.update_account(
        address=test_address,
        update=update_options,
        idempotency_key=test_idempotency_key,
    )

    mock_evm_accounts_api.update_evm_account.assert_called_once_with(
        address=test_address,
        update_evm_account_request=UpdateEvmAccountRequest(
            name=test_name,
            account_policy=test_account_policy,
        ),
        x_idempotency_key=test_idempotency_key,
    )


@pytest.mark.asyncio
async def test_update_smart_account(smart_account_model_factory):
    """Test updating an EVM smart account."""
    mock_evm_smart_accounts_api = AsyncMock()
    mock_api_clients = AsyncMock()
    mock_api_clients.evm_smart_accounts = mock_evm_smart_accounts_api

    evm_smart_account_model = smart_account_model_factory()

    mock_evm_smart_accounts_api.update_evm_smart_account = AsyncMock(
        return_value=evm_smart_account_model
    )

    client = EvmClient(api_clients=mock_api_clients)

    test_address = "0x1234567890123456789012345678901234567890"
    test_name = "updated-smart-account-name"
    test_idempotency_key = "test-idempotency-key"
    update_options = UpdateSmartAccountOptions(name=test_name)
    mock_owner = AsyncMock()
    mock_owner.address = "0x0987654321098765432109876543210987654321"

    result = await client.update_smart_account(
        address=test_address,
        update=update_options,
        idempotency_key=test_idempotency_key,
        owner=mock_owner,
    )

    mock_evm_smart_accounts_api.update_evm_smart_account.assert_called_once_with(
        address=test_address,
        update_evm_smart_account_request=UpdateEvmSmartAccountRequest(name=test_name),
    )

    assert result.address == evm_smart_account_model.address
    assert result.name == evm_smart_account_model.name


@pytest.mark.asyncio
async def test_get_smart_account(smart_account_model_factory):
    """Test getting an EVM smart account."""
    mock_evm_smart_accounts_api = AsyncMock()
    mock_api_clients = AsyncMock()
    mock_api_clients.evm_smart_accounts = mock_evm_smart_accounts_api

    evm_smart_account_model = smart_account_model_factory()
    mock_evm_smart_accounts_api.get_evm_smart_account = AsyncMock(
        return_value=evm_smart_account_model
    )

    client = EvmClient(api_clients=mock_api_clients)

    test_address = "0x1234567890123456789012345678901234567890"
    mock_owner = AsyncMock()
    mock_owner.address = "0x0987654321098765432109876543210987654321"

    result = await client.get_smart_account(address=test_address, owner=mock_owner)

    mock_evm_smart_accounts_api.get_evm_smart_account.assert_called_once_with(test_address)

    assert result.address == evm_smart_account_model.address
    assert result.name == evm_smart_account_model.name
    assert result.owners == [mock_owner]


@pytest.mark.asyncio
async def test_list_smart_accounts(smart_account_model_factory):
    """Test listing EVM smart accounts."""
    mock_evm_smart_accounts_api = AsyncMock()
    mock_api_clients = AsyncMock()
    mock_api_clients.evm_smart_accounts = mock_evm_smart_accounts_api

    # Create proper model instances instead of mocks
    mock_account_1 = smart_account_model_factory()
    mock_account_2 = smart_account_model_factory()

    mock_response = AsyncMock()
    mock_response.accounts = [mock_account_1, mock_account_2]
    mock_response.next_page_token = "next-page-token"
    mock_evm_smart_accounts_api.list_evm_smart_accounts = AsyncMock(return_value=mock_response)

    client = EvmClient(api_clients=mock_api_clients)

    result = await client.list_smart_accounts(page_size=10, page_token="page-token")

    mock_evm_smart_accounts_api.list_evm_smart_accounts.assert_called_once_with(
        page_size=10, page_token="page-token"
    )

    assert len(result.accounts) == 2
    assert result.accounts[0].address == mock_account_1.address
    assert result.accounts[0].name == mock_account_1.name
    assert result.accounts[1].address == mock_account_2.address
    assert result.accounts[1].name == mock_account_2.name
    assert result.next_page_token == "next-page-token"


@pytest.mark.asyncio
async def test_prepare_user_operation():
    """Test preparing a user operation."""
    mock_evm_smart_accounts_api = AsyncMock()
    mock_api_clients = AsyncMock()
    mock_api_clients.evm_smart_accounts = mock_evm_smart_accounts_api

    mock_smart_account = AsyncMock()
    mock_smart_account.address = "0x1234567890123456789012345678901234567890"
    mock_owner = AsyncMock()
    mock_owner.address = "0x0987654321098765432109876543210987654321"
    mock_smart_account.owner = mock_owner

    from cdp.evm_call_types import EncodedCall

    mock_calls = [
        EncodedCall(
            to="0x1234567890123456789012345678901234567890",
            data="0xabcdef",
            value="1000000000000000000",
        ),
        EncodedCall(to="0x4567890123456789012345678901234567890123", data="0x123456", value=None),
    ]

    mock_user_operation = AsyncMock()
    mock_user_operation.userOpHash = "0x789"
    mock_user_operation.network = "base-sepolia"
    mock_user_operation.calls = [AsyncMock(), AsyncMock()]
    mock_user_operation.status = "pending"

    mock_evm_smart_accounts_api.prepare_user_operation = AsyncMock(return_value=mock_user_operation)

    client = EvmClient(api_clients=mock_api_clients)

    test_network = "base-sepolia"
    test_paymaster_url = "https://paymaster.example.com"

    result = await client.prepare_user_operation(
        smart_account=mock_smart_account,
        calls=mock_calls,
        network=test_network,
        paymaster_url=test_paymaster_url,
    )

    mock_evm_smart_accounts_api.prepare_user_operation.assert_called_once()
    call_args = mock_evm_smart_accounts_api.prepare_user_operation.call_args
    assert call_args[0][0] == mock_smart_account.address

    request_obj = call_args[0][1]
    assert request_obj.network == test_network
    assert request_obj.paymaster_url == test_paymaster_url

    assert len(request_obj.calls) == 2
    assert request_obj.calls[0].to == "0x1234567890123456789012345678901234567890"
    assert request_obj.calls[0].data == "0xabcdef"
    assert request_obj.calls[0].value == "1000000000000000000"
    assert request_obj.calls[1].to == "0x4567890123456789012345678901234567890123"
    assert request_obj.calls[1].data == "0x123456"
    assert request_obj.calls[1].value == "0"

    assert result == mock_user_operation


@pytest.mark.asyncio
async def test_get_user_operation():
    """Test getting a user operation."""
    mock_evm_smart_accounts_api = AsyncMock()
    mock_api_clients = AsyncMock()
    mock_api_clients.evm_smart_accounts = mock_evm_smart_accounts_api

    mock_user_operation = AsyncMock()
    mock_user_operation.userOpHash = "0x789"
    mock_user_operation.network = "ethereum"
    mock_user_operation.calls = [AsyncMock(), AsyncMock()]
    mock_user_operation.status = "pending"

    mock_evm_smart_accounts_api.get_user_operation = AsyncMock(return_value=mock_user_operation)

    client = EvmClient(api_clients=mock_api_clients)

    test_address = "0x1234567890123456789012345678901234567890"
    test_user_op_hash = "0x789"

    result = await client.get_user_operation(address=test_address, user_op_hash=test_user_op_hash)

    mock_evm_smart_accounts_api.get_user_operation.assert_called_once_with(
        test_address, test_user_op_hash
    )

    assert result == mock_user_operation


@pytest.mark.asyncio
async def test_list_token_balances(evm_token_balances_model_factory):
    """Test listing EVM token balances."""
    mock_evm_token_balances_api = AsyncMock()
    mock_api_clients = AsyncMock()
    mock_api_clients.evm_token_balances = mock_evm_token_balances_api

    mock_token_balances = evm_token_balances_model_factory()

    mock_evm_token_balances_api.list_evm_token_balances = AsyncMock(
        return_value=mock_token_balances
    )

    expected_result = ListTokenBalancesResult(
        balances=[
            EvmTokenBalance(
                token=EvmToken(
                    contract_address="0x1234567890123456789012345678901234567890",
                    network="base-sepolia",
                    symbol="TEST",
                    name="Test Token",
                ),
                amount=EvmTokenAmount(amount=1000000000000000000, decimals=18),
            ),
        ],
        next_page_token="next-page-token",
    )

    client = EvmClient(api_clients=mock_api_clients)

    test_address = "0x1234567890123456789012345678901234567890"
    test_network = "base-sepolia"

    result = await client.list_token_balances(address=test_address, network=test_network)

    mock_evm_token_balances_api.list_evm_token_balances.assert_called_once_with(
        address=test_address, network=test_network, page_size=None, page_token=None
    )

    assert result == expected_result
