from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from eth_account.messages import _hash_eip191_message, encode_defunct
from eth_typing import Hash32
from hexbytes import HexBytes

from cdp.evm_server_account import EvmServerAccount
from cdp.openapi_client.models.sign_evm_hash_request import SignEvmHashRequest
from cdp.openapi_client.models.sign_evm_message_request import SignEvmMessageRequest
from cdp.openapi_client.models.sign_evm_transaction_request import (
    SignEvmTransactionRequest,
)


@patch("cdp.evm_server_account.EVMAccountsApi")
def test_initialization(mock_api, server_account_model_factory):
    """Test that the EvmServerAccount initializes correctly."""
    address = "0x1234567890123456789012345678901234567890"
    name = "test-account"

    server_account_model = server_account_model_factory(address, name)
    server_account = EvmServerAccount(server_account_model, mock_api, mock_api)

    assert server_account.address == address
    assert server_account.name == name


@patch("cdp.evm_server_account.EVMAccountsApi")
def test_str_representation(mock_api, server_account_model_factory):
    """Test the string representation of EvmServerAccount."""
    address = "0x1234567890123456789012345678901234567890"

    server_account_model = server_account_model_factory(address)
    server_account = EvmServerAccount(server_account_model, mock_api, mock_api)

    expected = f"Ethereum Account Address: {address}"
    assert str(server_account) == expected


@patch("cdp.evm_server_account.EVMAccountsApi")
def test_repr_representation(mock_api, server_account_model_factory):
    """Test the repr representation of EvmServerAccount."""
    address = "0x1234567890123456789012345678901234567890"
    server_account_model = server_account_model_factory(address)
    server_account = EvmServerAccount(server_account_model, mock_api, mock_api)

    expected = f"Ethereum Account Address: {address}"
    assert repr(server_account) == expected


@pytest.mark.asyncio
@patch("cdp.evm_server_account.EVMAccountsApi")
async def test_sign_message_with_bytes(mock_api, server_account_model_factory):
    """Test sign_message method with bytes message."""
    address = "0x1234567890123456789012345678901234567890"
    name = "test-account"
    server_account_model = server_account_model_factory(address, name)

    # Create a real mock instance, not just the class
    mock_api_instance = mock_api.return_value
    server_account = EvmServerAccount(server_account_model, mock_api_instance, mock_api_instance)

    message = b"Test message"
    signable_message = encode_defunct(message)

    signature_response = MagicMock()
    # Create a real bytes-like object for the signature that's 65 bytes long
    # (32 bytes for r, 32 bytes for s, 1 byte for v). 1b = 27 in hex
    mock_signature = bytes.fromhex("1234" * 32 + "5678" * 32 + "1b")

    signature_response.signature = mock_signature
    mock_api_instance.sign_evm_message.return_value = signature_response

    result = await server_account.sign_message(signable_message)

    message_hex = HexBytes(message).hex()
    sign_request = SignEvmMessageRequest(message=message_hex)
    mock_api_instance.sign_evm_message.assert_called_once_with(
        address, sign_request, x_idempotency_key=None
    )

    assert result.r == int.from_bytes(mock_signature[0:32], byteorder="big")
    assert result.s == int.from_bytes(mock_signature[32:64], byteorder="big")
    assert result.v == mock_signature[64]
    assert result.signature == HexBytes(mock_signature)
    assert result.message_hash == _hash_eip191_message(signable_message)


@pytest.mark.asyncio
@patch("cdp.evm_server_account.EVMAccountsApi")
async def test_unsafe_sign_hash(mock_api, server_account_model_factory):
    """Test unsafe_sign_hash method."""
    address = "0x1234567890123456789012345678901234567890"
    name = "test-account"
    server_account_model = server_account_model_factory(address, name)

    mock_api_instance = mock_api.return_value
    server_account = EvmServerAccount(server_account_model, mock_api_instance, mock_api_instance)

    message_hash = Hash32(bytes.fromhex("abcd" * 16))

    signature_response = MagicMock()
    # Create a real bytes-like object for the signature (65 bytes: 32 for r, 32 for s, 1 for v)
    mock_signature = bytes.fromhex("1234" * 32 + "5678" * 32 + "1b")
    signature_response.signature = mock_signature
    mock_api_instance.sign_evm_hash = AsyncMock(return_value=signature_response)

    result = await server_account.unsafe_sign_hash(message_hash)

    hash_hex = HexBytes(message_hash).hex()
    sign_request = SignEvmHashRequest(hash=hash_hex)
    mock_api_instance.sign_evm_hash.assert_called_once_with(
        address=address, sign_evm_hash_request=sign_request, x_idempotency_key=None
    )

    assert result.r == int.from_bytes(mock_signature[0:32], byteorder="big")
    assert result.s == int.from_bytes(mock_signature[32:64], byteorder="big")
    assert result.v == mock_signature[64]
    assert result.signature == HexBytes(mock_signature)
    assert result.message_hash == message_hash


@pytest.mark.asyncio
@patch("cdp.evm_server_account.Web3")
@patch("cdp.evm_server_account.TypedTransaction")
@patch("cdp.evm_server_account.EVMAccountsApi")
async def test_sign_transaction(mock_api, mock_typed_tx, mock_web3, server_account_model_factory):
    """Test sign_transaction method."""
    address = "0x1234567890123456789012345678901234567890"
    name = "test-account"
    server_account_model = server_account_model_factory(address, name)

    mock_api_instance = mock_api.return_value
    server_account = EvmServerAccount(server_account_model, mock_api_instance, mock_api_instance)

    transaction_dict = {
        "maxFeePerGas": 2000000000,
        "maxPriorityFeePerGas": 1000000000,
        "nonce": 0,
        "gas": 21000,
        "to": "0x2B5AD5c4795c026514f8317c7a215E218DcCD6cF",
        "value": 1000000000000000000,
        "data": "0x",
        "chainId": 1,
        "type": 2,
    }

    mock_tx_instance = MagicMock()
    mock_typed_tx.from_dict.return_value = mock_tx_instance

    mock_tx_instance.transaction_type = 2
    mock_tx_instance.transaction = MagicMock()
    mock_tx_instance.transaction.dictionary = {
        "nonce": 0,
        "maxFeePerGas": 2000000000,
        "maxPriorityFeePerGas": 1000000000,
        "gas": 21000,
        "to": "0x2B5AD5c4795c026514f8317c7a215E218DcCD6cF",
        "value": 1000000000000000000,
        "data": "0x",
        "chainId": 1,
        "v": 0,
        "r": 0,
        "s": 0,
    }
    mock_payload = bytes.fromhex("f864")
    mock_tx_instance.transaction.payload.return_value = mock_payload

    serialized_tx_with_type = bytes([2]) + mock_payload
    tx_hex_with_0x = "0x" + serialized_tx_with_type.hex()

    mock_signature = bytes.fromhex("1234" * 32 + "5678" * 32 + "1b")
    signature_response = MagicMock()
    signature_response.signed_transaction = mock_signature
    mock_api_instance.sign_evm_transaction = AsyncMock(return_value=signature_response)

    mock_tx_hash = bytes.fromhex("abcd" * 8)
    mock_web3.keccak.return_value = mock_tx_hash

    result = await server_account.sign_transaction(transaction_dict)

    mock_typed_tx.from_dict.assert_called_once_with(transaction_dict)
    assert mock_tx_instance.transaction.dictionary["v"] == 0
    assert mock_tx_instance.transaction.dictionary["r"] == 0
    assert mock_tx_instance.transaction.dictionary["s"] == 0
    mock_tx_instance.transaction.payload.assert_called_once()

    expected_request = SignEvmTransactionRequest(transaction=tx_hex_with_0x)
    mock_api_instance.sign_evm_transaction.assert_called_once_with(
        address=address,
        sign_evm_transaction_request=expected_request,
        x_idempotency_key=None,
    )

    mock_web3.keccak.assert_called_once_with(HexBytes(mock_signature))

    assert result.raw_transaction == HexBytes(mock_signature)
    assert result.hash == mock_tx_hash
    assert result.r == int.from_bytes(mock_signature[0:32], byteorder="big")
    assert result.s == int.from_bytes(mock_signature[32:64], byteorder="big")
    assert result.v == mock_signature[64]
