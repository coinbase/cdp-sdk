from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from eth_account.messages import encode_defunct
from hexbytes import HexBytes

from cdp.evm_local_account import EvmLocalAccount
from cdp.openapi_client.models.eip712_domain import EIP712Domain


def test_initialization(server_account_model_factory):
    """Test that the EvmLocalAccount initializes correctly."""
    address = "0x1234567890123456789012345678901234567890"
    server_account_model = server_account_model_factory(address)
    evm_local_account = EvmLocalAccount(server_account_model)
    assert evm_local_account.address == server_account_model.address


def test_str_representation(server_account_model_factory):
    """Test the string representation of the EvmLocalAccount."""
    address = "0x1234567890123456789012345678901234567890"
    server_account_model = server_account_model_factory(address)
    evm_local_account = EvmLocalAccount(server_account_model)
    assert str(evm_local_account) == f"Ethereum Account Address: {address}"


def test_repr_representation(server_account_model_factory):
    """Test the repr representation of the EvmLocalAccount."""
    address = "0x1234567890123456789012345678901234567890"
    server_account_model = server_account_model_factory(address)
    evm_local_account = EvmLocalAccount(server_account_model)
    assert repr(evm_local_account) == f"Ethereum Account Address: {address}"


@pytest.mark.asyncio
@patch("cdp.evm_local_account.EvmServerAccount")
async def test_unsafe_sign_hash(mock_server_account):
    """Test that the EvmLocalAccount can sign a hash."""
    signature_response = MagicMock()
    # Create a real bytes-like object for the signature (65 bytes: 32 for r, 32 for s, 1 for v)
    mock_signature = bytes.fromhex("1234" * 32 + "5678" * 32 + "1b")
    signature_response.signature = mock_signature
    mock_server_account.unsafe_sign_hash = AsyncMock(return_value=signature_response)
    evm_local_account = EvmLocalAccount(mock_server_account)
    message_hash = b"test"
    signed_message = evm_local_account.unsafe_sign_hash(message_hash)
    mock_server_account.unsafe_sign_hash.assert_called_once_with(message_hash)
    assert signed_message == signature_response
    assert signed_message.signature == HexBytes(mock_signature)


@pytest.mark.asyncio
@patch("cdp.evm_local_account.EvmServerAccount")
async def test_sign_message(mock_server_account):
    """Test that the EvmLocalAccount can sign a message."""
    signature_response = MagicMock()
    mock_signature = bytes.fromhex("1234" * 32 + "5678" * 32 + "1b")
    signature_response.signature = mock_signature
    mock_server_account.sign_message = AsyncMock(return_value=signature_response)
    evm_local_account = EvmLocalAccount(mock_server_account)
    message = encode_defunct(text="test")
    signed_message = evm_local_account.sign_message(message)
    mock_server_account.sign_message.assert_called_once_with(message)
    assert signed_message == signature_response
    assert signed_message.signature == HexBytes(mock_signature)


@pytest.mark.asyncio
@patch("cdp.evm_local_account.EvmServerAccount")
async def test_sign_transaction(mock_server_account):
    """Test that the EvmLocalAccount can sign a transaction."""
    signature_response = MagicMock()
    mock_server_account.sign_transaction = AsyncMock(return_value=signature_response)
    evm_local_account = EvmLocalAccount(mock_server_account)
    transaction = MagicMock()
    signed_transaction = evm_local_account.sign_transaction(transaction)
    mock_server_account.sign_transaction.assert_called_once_with(transaction)
    assert signed_transaction == signature_response


@pytest.mark.asyncio
@patch("cdp.evm_local_account.EvmServerAccount")
async def test_sign_typed_data_with_full_message(mock_server_account):
    """Test that the EvmLocalAccount can sign typed data with a full message."""
    signature_response = MagicMock()
    mock_server_account.sign_typed_data = AsyncMock(return_value=signature_response)
    evm_local_account = EvmLocalAccount(mock_server_account)
    full_message = {
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
    signed_message = evm_local_account.sign_typed_data(full_message=full_message)
    mock_server_account.sign_typed_data.assert_called_once_with(
        domain=EIP712Domain(
            name="test",
            version="test",
            chainId=1,
            verifyingContract="0x1234567890123456789012345678901234567890",
        ),
        types=full_message["types"],
        primary_type=full_message["primaryType"],
        message=full_message["message"],
    )
    assert signed_message == signature_response


@pytest.mark.asyncio
@patch("cdp.evm_local_account.EvmServerAccount")
async def test_sign_typed_data_with_domain_data_message_types_message_data(mock_server_account):
    """Test that the EvmLocalAccount can sign typed data with domain data, message types, and message data."""
    signature_response = MagicMock()
    mock_server_account.sign_typed_data = AsyncMock(return_value=signature_response)
    evm_local_account = EvmLocalAccount(mock_server_account)
    domain_data = {
        "name": "test",
        "version": "test",
        "chainId": 1,
        "verifyingContract": "0x1234567890123456789012345678901234567890",
    }
    message_types = {
        "EIP712Domain": [
            {"name": "name", "type": "string"},
            {"name": "version", "type": "string"},
            {"name": "chainId", "type": "uint256"},
            {"name": "verifyingContract", "type": "address"},
        ],
        "test": [{"name": "test", "type": "test"}],
    }
    message_data = {"test": "test"}
    signed_message = evm_local_account.sign_typed_data(
        domain_data=domain_data,
        message_types=message_types,
        message_data=message_data,
    )
    mock_server_account.sign_typed_data.assert_called_once_with(
        domain=EIP712Domain(
            name="test",
            version="test",
            chainId=1,
            verifyingContract="0x1234567890123456789012345678901234567890",
        ),
        types=message_types,
        primary_type="test",
        message=message_data,
    )
    assert signed_message == signature_response


@pytest.mark.asyncio
@patch("cdp.evm_local_account.EvmServerAccount")
async def test_sign_typed_data_with_bad_arguments(mock_server_account):
    """Test that the EvmLocalAccount raises the correct error if the arguments are bad."""
    evm_local_account = EvmLocalAccount(mock_server_account)
    with pytest.raises(
        ValueError,
        match="Must provide either full_message or all of domain_data, message_types, and message_data",
    ):
        evm_local_account.sign_typed_data()

    with pytest.raises(
        ValueError,
        match="Must provide either full_message or all of domain_data, message_types, and message_data",
    ):
        evm_local_account.sign_typed_data(full_message=None)

    with pytest.raises(
        ValueError,
        match="Must provide either full_message or all of domain_data, message_types, and message_data",
    ):
        evm_local_account.sign_typed_data(
            domain_data={"name": "test"},
            message_types={"test": [{"name": "test", "type": "test"}]},
        )

    with pytest.raises(
        ValueError,
        match="Must provide either full_message or all of domain_data, message_types, and message_data",
    ):
        evm_local_account.sign_typed_data(
            domain_data={"name": "test"},
            message_data={"test": "test"},
        )

    with pytest.raises(
        ValueError,
        match="Must provide either full_message or all of domain_data, message_types, and message_data",
    ):
        evm_local_account.sign_typed_data(
            message_types={"test": [{"name": "test", "type": "test"}]},
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
