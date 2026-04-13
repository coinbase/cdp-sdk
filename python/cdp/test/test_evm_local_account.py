from unittest.mock import MagicMock, patch

import pytest
from eth_account.messages import encode_defunct
from hexbytes import HexBytes

from cdp.evm_local_account import EvmLocalAccount


def _make_server_account(address="0x1234567890123456789012345678901234567890"):
    """Build a minimal EvmServerAccount mock with the attributes EvmLocalAccount.__init__ needs."""
    server_account = MagicMock()
    server_account.address = address
    cdp_client = server_account.api_clients._cdp_client
    cdp_client.api_key_id = "test-key-id"
    cdp_client.api_key_secret = "test-key-secret"
    cdp_client.wallet_secret = "test-wallet-secret"
    cdp_client.source = "sdk"
    cdp_client.source_version = "1.0.0"
    cdp_client.configuration.host = "https://api.cdp.coinbase.com/platform"
    return server_account


@patch("cdp.evm_local_account.Urllib3AuthClient")
def test_initialization(mock_auth_client):
    """Test that the EvmLocalAccount initializes correctly."""
    address = "0x1234567890123456789012345678901234567890"
    server_account = _make_server_account(address)
    evm_local_account = EvmLocalAccount(server_account)
    assert evm_local_account.address == address


@patch("cdp.evm_local_account.Urllib3AuthClient")
def test_str_representation(mock_auth_client):
    """Test the string representation of the EvmLocalAccount."""
    address = "0x1234567890123456789012345678901234567890"
    server_account = _make_server_account(address)
    evm_local_account = EvmLocalAccount(server_account)
    assert str(evm_local_account) == f"Ethereum Account Address: {address}"


@patch("cdp.evm_local_account.Urllib3AuthClient")
def test_repr_representation(mock_auth_client):
    """Test the repr representation of the EvmLocalAccount."""
    address = "0x1234567890123456789012345678901234567890"
    server_account = _make_server_account(address)
    evm_local_account = EvmLocalAccount(server_account)
    assert repr(evm_local_account) == f"Ethereum Account Address: {address}"


@patch("cdp.evm_local_account._EvmServerAccountSync")
@patch("cdp.evm_local_account.Urllib3AuthClient")
def test_unsafe_sign_hash(mock_auth_client, mock_sync_account):
    """Test that the EvmLocalAccount can sign a hash."""
    mock_sync = mock_sync_account.return_value
    signature_response = MagicMock()
    mock_signature = bytes.fromhex("1234" * 32 + "5678" * 32 + "1b")
    signature_response.signature = mock_signature
    mock_sync.unsafe_sign_hash.return_value = signature_response

    server_account = _make_server_account()
    evm_local_account = EvmLocalAccount(server_account)
    message_hash = b"test"
    signed_message = evm_local_account.unsafe_sign_hash(message_hash)

    mock_sync.unsafe_sign_hash.assert_called_once_with(message_hash)
    assert signed_message == signature_response
    assert signed_message.signature == HexBytes(mock_signature)


@patch("cdp.evm_local_account._EvmServerAccountSync")
@patch("cdp.evm_local_account.Urllib3AuthClient")
def test_sign_message(mock_auth_client, mock_sync_account):
    """Test that the EvmLocalAccount can sign a message."""
    mock_sync = mock_sync_account.return_value
    signature_response = MagicMock()
    mock_signature = bytes.fromhex("1234" * 32 + "5678" * 32 + "1b")
    signature_response.signature = mock_signature
    mock_sync.sign_message.return_value = signature_response

    server_account = _make_server_account()
    evm_local_account = EvmLocalAccount(server_account)
    message = encode_defunct(text="test")
    signed_message = evm_local_account.sign_message(message)

    mock_sync.sign_message.assert_called_once_with(message)
    assert signed_message == signature_response
    assert signed_message.signature == HexBytes(mock_signature)


@patch("cdp.evm_local_account._EvmServerAccountSync")
@patch("cdp.evm_local_account.Urllib3AuthClient")
def test_sign_transaction(mock_auth_client, mock_sync_account):
    """Test that the EvmLocalAccount can sign a transaction."""
    mock_sync = mock_sync_account.return_value
    signature_response = MagicMock()
    mock_sync.sign_transaction.return_value = signature_response

    server_account = _make_server_account()
    evm_local_account = EvmLocalAccount(server_account)
    transaction = MagicMock()
    signed_transaction = evm_local_account.sign_transaction(transaction)

    mock_sync.sign_transaction.assert_called_once_with(transaction)
    assert signed_transaction == signature_response


@patch("cdp.evm_local_account._EvmServerAccountSync")
@patch("cdp.evm_local_account.Urllib3AuthClient")
@patch("cdp.evm_local_account.encode_typed_data")
@patch("cdp.evm_local_account._hash_eip191_message")
def test_sign_typed_data_with_full_message(
    mock_hash_eip191, mock_encode_typed_data, mock_auth_client, mock_sync_account
):
    """Test that the EvmLocalAccount can sign typed data with a full message."""
    mock_sync = mock_sync_account.return_value
    signature_response = MagicMock()
    mock_sync.unsafe_sign_hash.return_value = signature_response

    signable_message = MagicMock()
    mock_encode_typed_data.return_value = signable_message
    message_hash = MagicMock()
    mock_hash_eip191.return_value = message_hash

    server_account = _make_server_account()
    evm_local_account = EvmLocalAccount(server_account)
    signed_message = evm_local_account.sign_typed_data(
        full_message={
            "domain": {
                "name": "test",
                "version": "test",
                "chainId": 1,
                "verifyingContract": "0x1234567890123456789012345678901234567890",
            },
            "types": {
                "test": [
                    {"name": "test", "type": "test"},
                ],
            },
            "primaryType": "test",
            "message": {"test": "test"},
        }
    )

    mock_encode_typed_data.assert_called_once_with(
        full_message={
            "domain": {
                "name": "test",
                "version": "test",
                "chainId": 1,
                "verifyingContract": "0x1234567890123456789012345678901234567890",
            },
            "types": {
                "EIP712Domain": [
                    {"name": "name", "type": "string"},
                    {"name": "version", "type": "string"},
                    {"name": "chainId", "type": "uint256"},
                    {"name": "verifyingContract", "type": "address"},
                ],
                "test": [
                    {"name": "test", "type": "test"},
                ],
            },
            "primaryType": "test",
            "message": {"test": "test"},
        }
    )
    mock_hash_eip191.assert_called_once_with(signable_message)
    mock_sync.unsafe_sign_hash.assert_called_once_with(message_hash)
    assert signed_message == signature_response


@patch("cdp.evm_local_account._EvmServerAccountSync")
@patch("cdp.evm_local_account.Urllib3AuthClient")
@patch("cdp.evm_local_account.encode_typed_data")
@patch("cdp.evm_local_account._hash_eip191_message")
def test_sign_typed_data_with_domain_data_message_types_message_data(
    mock_hash_eip191, mock_encode_typed_data, mock_auth_client, mock_sync_account
):
    """Test that the EvmLocalAccount can sign typed data with domain data, message types, and message data."""
    mock_sync = mock_sync_account.return_value
    signature_response = MagicMock()
    mock_sync.unsafe_sign_hash.return_value = signature_response

    signable_message = MagicMock()
    mock_encode_typed_data.return_value = signable_message
    message_hash = MagicMock()
    mock_hash_eip191.return_value = message_hash

    server_account = _make_server_account()
    evm_local_account = EvmLocalAccount(server_account)
    signed_message = evm_local_account.sign_typed_data(
        domain_data={
            "name": "test",
            "version": "test",
            "chainId": 1,
            "verifyingContract": "0x1234567890123456789012345678901234567890",
        },
        message_types={
            "EIP712Domain": [
                {"name": "name", "type": "string"},
                {"name": "version", "type": "string"},
                {"name": "chainId", "type": "uint256"},
                {"name": "verifyingContract", "type": "address"},
            ],
            "test": [{"name": "test", "type": "test"}],
        },
        message_data={
            "test": "test",
        },
    )

    mock_encode_typed_data.assert_called_once_with(
        full_message={
            "domain": {
                "name": "test",
                "version": "test",
                "chainId": 1,
                "verifyingContract": "0x1234567890123456789012345678901234567890",
            },
            "types": {
                "EIP712Domain": [
                    {"name": "name", "type": "string"},
                    {"name": "version", "type": "string"},
                    {"name": "chainId", "type": "uint256"},
                    {"name": "verifyingContract", "type": "address"},
                ],
                "test": [{"name": "test", "type": "test"}],
            },
            "primaryType": "test",
            "message": {"test": "test"},
        }
    )
    mock_hash_eip191.assert_called_once_with(signable_message)
    mock_sync.unsafe_sign_hash.assert_called_once_with(message_hash)
    assert signed_message == signature_response


@patch("cdp.evm_local_account._EvmServerAccountSync")
@patch("cdp.evm_local_account.Urllib3AuthClient")
@patch("cdp.evm_local_account.encode_typed_data")
@patch("cdp.evm_local_account._hash_eip191_message")
def test_sign_typed_data_with_bytes32_type(
    mock_hash_eip191, mock_encode_typed_data, mock_auth_client, mock_sync_account
):
    """Test that the EvmLocalAccount can sign typed data with a bytes32 type."""
    mock_sync = mock_sync_account.return_value
    signature_response = MagicMock()
    mock_sync.unsafe_sign_hash.return_value = signature_response

    signable_message = MagicMock()
    mock_encode_typed_data.return_value = signable_message
    message_hash = MagicMock()
    mock_hash_eip191.return_value = message_hash

    server_account = _make_server_account()
    evm_local_account = EvmLocalAccount(server_account)
    signed_message = evm_local_account.sign_typed_data(
        full_message={
            "domain": {
                "name": "test",
                "version": "test",
                "chainId": 1,
                "verifyingContract": "0x1234567890123456789012345678901234567890",
            },
            "types": {
                "test": [
                    {"name": "test", "type": "bytes32"},
                ],
            },
            "primaryType": "test",
            "message": {
                "test": bytes.fromhex(
                    "0000000000000000000000001234567890123456789012345678901234567890"
                )
            },
        }
    )

    mock_encode_typed_data.assert_called_once_with(
        full_message={
            "domain": {
                "name": "test",
                "version": "test",
                "chainId": 1,
                "verifyingContract": "0x1234567890123456789012345678901234567890",
            },
            "types": {
                "EIP712Domain": [
                    {"name": "name", "type": "string"},
                    {"name": "version", "type": "string"},
                    {"name": "chainId", "type": "uint256"},
                    {"name": "verifyingContract", "type": "address"},
                ],
                "test": [
                    {"name": "test", "type": "bytes32"},
                ],
            },
            "primaryType": "test",
            "message": {
                "test": "0x0000000000000000000000001234567890123456789012345678901234567890"
            },
        }
    )
    mock_hash_eip191.assert_called_once_with(signable_message)
    mock_sync.unsafe_sign_hash.assert_called_once_with(message_hash)
    assert signed_message == signature_response


@patch("cdp.evm_local_account._EvmServerAccountSync")
@patch("cdp.evm_local_account.Urllib3AuthClient")
@patch("cdp.evm_local_account.encode_typed_data")
@patch("cdp.evm_local_account._hash_eip191_message")
def test_sign_typed_data_with_bytes32_type_without_eip712_domain_type(
    mock_hash_eip191, mock_encode_typed_data, mock_auth_client, mock_sync_account
):
    """Test that the EvmLocalAccount can sign typed data with a bytes32 type without the EIP712Domain type."""
    mock_sync = mock_sync_account.return_value
    signature_response = MagicMock()
    mock_sync.unsafe_sign_hash.return_value = signature_response

    signable_message = MagicMock()
    mock_encode_typed_data.return_value = signable_message
    message_hash = MagicMock()
    mock_hash_eip191.return_value = message_hash

    server_account = _make_server_account()
    evm_local_account = EvmLocalAccount(server_account)

    signed_message = evm_local_account.sign_typed_data(
        full_message={
            "domain": {
                "name": "EIP712Domain",
                "version": "1",
            },
            "types": {
                "test": [
                    {"name": "test", "type": "bytes32"},
                ],
            },
            "primaryType": "test",
            "message": {
                "test": bytes.fromhex(
                    "0000000000000000000000001234567890123456789012345678901234567890"
                )
            },
        }
    )

    mock_encode_typed_data.assert_called_with(
        full_message={
            "domain": {
                "name": "EIP712Domain",
                "version": "1",
            },
            "types": {
                "EIP712Domain": [
                    {"name": "name", "type": "string"},
                    {"name": "version", "type": "string"},
                ],
                "test": [
                    {"name": "test", "type": "bytes32"},
                ],
            },
            "primaryType": "test",
            "message": {
                "test": "0x0000000000000000000000001234567890123456789012345678901234567890",
            },
        }
    )
    mock_hash_eip191.assert_called_with(signable_message)
    mock_sync.unsafe_sign_hash.assert_called_with(message_hash)
    assert signed_message == signature_response

    signed_message = evm_local_account.sign_typed_data(
        domain_data={
            "name": "EIP712Domain",
            "version": "1",
        },
        message_types={
            "test": [
                {"name": "test", "type": "bytes32"},
            ],
        },
        message_data={
            "test": bytes.fromhex(
                "0000000000000000000000001234567890123456789012345678901234567890"
            )
        },
    )

    mock_encode_typed_data.assert_called_with(
        full_message={
            "domain": {
                "name": "EIP712Domain",
                "version": "1",
            },
            "types": {
                "EIP712Domain": [
                    {"name": "name", "type": "string"},
                    {"name": "version", "type": "string"},
                ],
                "test": [
                    {"name": "test", "type": "bytes32"},
                ],
            },
            "primaryType": "test",
            "message": {
                "test": "0x0000000000000000000000001234567890123456789012345678901234567890",
            },
        }
    )
    mock_hash_eip191.assert_called_with(signable_message)
    mock_sync.unsafe_sign_hash.assert_called_with(message_hash)
    assert signed_message == signature_response


@patch("cdp.evm_local_account._EvmServerAccountSync")
@patch("cdp.evm_local_account.Urllib3AuthClient")
def test_sign_typed_data_with_bad_arguments(mock_auth_client, mock_sync_account):
    """Test that the EvmLocalAccount raises the correct error if the arguments are bad."""
    server_account = _make_server_account()
    evm_local_account = EvmLocalAccount(server_account)

    with pytest.raises(
        ValueError,
        match="Must provide either full_message or both message_types and message_data",
    ):
        evm_local_account.sign_typed_data()

    with pytest.raises(
        ValueError,
        match="Must provide either full_message or both message_types and message_data",
    ):
        evm_local_account.sign_typed_data(full_message=None)

    with pytest.raises(
        ValueError,
        match="Must provide either full_message or both message_types and message_data",
    ):
        evm_local_account.sign_typed_data(
            domain_data={"name": "test"},
            message_types={"test": [{"name": "test", "type": "test"}]},
        )

    with pytest.raises(
        ValueError,
        match="Must provide either full_message or both message_types and message_data",
    ):
        evm_local_account.sign_typed_data(
            domain_data={"name": "test"},
            message_data={"test": "test"},
        )

    with pytest.raises(
        ValueError,
        match="Could not infer primaryType from message_types",
    ):
        evm_local_account.sign_typed_data(
            domain_data={"name": "test"},
            message_types={
                "EIP712Domain": [
                    {"name": "name", "type": "string"},
                    {"name": "version", "type": "string"},
                    {"name": "chainId", "type": "uint256"},
                    {"name": "verifyingContract", "type": "address"},
                ]
            },
            message_data={"test": "test"},
        )
