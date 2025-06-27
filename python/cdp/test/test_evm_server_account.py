from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from eth_account.messages import _hash_eip191_message, encode_defunct
from eth_account.typed_transactions import DynamicFeeTransaction
from eth_typing import Hash32
from hexbytes import HexBytes
from web3 import Web3

from cdp.actions.evm.fund.quote import Quote
from cdp.api_clients import ApiClients
from cdp.evm_server_account import EvmServerAccount
from cdp.evm_token_balances import (
    EvmToken,
    EvmTokenAmount,
    EvmTokenBalance,
    ListTokenBalancesResult,
)
from cdp.evm_transaction_types import TransactionRequestEIP1559
from cdp.openapi_client.models.create_payment_transfer_quote201_response import (
    CreatePaymentTransferQuote201Response,
)
from cdp.openapi_client.models.eip712_domain import EIP712Domain
from cdp.openapi_client.models.eip712_message import EIP712Message
from cdp.openapi_client.models.request_evm_faucet_request import RequestEvmFaucetRequest
from cdp.openapi_client.models.send_evm_transaction200_response import SendEvmTransaction200Response
from cdp.openapi_client.models.send_evm_transaction_request import SendEvmTransactionRequest
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

    signature_response = AsyncMock()
    # Create a real bytes-like object for the signature that's 65 bytes long
    # (32 bytes for r, 32 bytes for s, 1 byte for v). 1b = 27 in hex
    mock_signature = bytes.fromhex("1234" * 32 + "5678" * 32 + "1b")

    signature_response.signature = mock_signature
    mock_api_instance.sign_evm_message = AsyncMock(return_value=signature_response)

    result = await server_account.sign_message(signable_message)

    message_hex = HexBytes(message).hex()
    sign_request = SignEvmMessageRequest(message=message_hex)
    mock_api_instance.sign_evm_message.assert_called_once_with(
        address=address,
        sign_evm_message_request=sign_request,
        x_idempotency_key=None,
    )

    assert result.r == int.from_bytes(mock_signature[0:32], byteorder="big")
    assert result.s == int.from_bytes(mock_signature[32:64], byteorder="big")
    assert result.v == mock_signature[64]
    assert result.signature == HexBytes(mock_signature)
    assert result.message_hash == _hash_eip191_message(signable_message)


@pytest.mark.asyncio
@patch("cdp.evm_server_account.EVMAccountsApi")
async def test_sign_typed_data(mock_api, server_account_model_factory):
    """Test sign_typed_data method."""
    address = "0x1234567890123456789012345678901234567890"

    server_account_model = server_account_model_factory(address)
    server_account = EvmServerAccount(server_account_model, mock_api, mock_api)

    domain = EIP712Domain(
        name="EIP712Domain",
        version="1",
        chain_id=1,
        verifying_contract="0x1234567890123456789012345678901234567890",
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
        "verifyingContract": "0x1234567890123456789012345678901234567890",
    }
    test_idempotency_key = "test-idempotency-key"

    signature_response = AsyncMock()
    signature_response.signature = "0xsignature"
    mock_api.sign_evm_typed_data = AsyncMock(return_value=signature_response)

    result = await server_account.sign_typed_data(
        domain=domain,
        types=types,
        primary_type=primary_type,
        message=message,
        idempotency_key=test_idempotency_key,
    )

    assert result == signature_response.signature

    mock_api.sign_evm_typed_data.assert_called_once_with(
        address=address,
        eip712_message=EIP712Message(
            domain=domain,
            types=types,
            primary_type=primary_type,
            message=message,
        ),
        x_idempotency_key=test_idempotency_key,
    )


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


@pytest.mark.asyncio
async def test_request_faucet(server_account_model_factory):
    """Test request_faucet method."""
    address = "0x1234567890123456789012345678901234567890"
    name = "test-account"
    server_account_model = server_account_model_factory(address, name)

    mock_faucets_api = AsyncMock()
    mock_api_instance = AsyncMock()
    mock_api_instance.faucets = mock_faucets_api

    mock_response = AsyncMock()
    mock_response.transaction_hash = "0x123"
    mock_faucets_api.request_evm_faucet = AsyncMock(return_value=mock_response)
    server_account = EvmServerAccount(server_account_model, mock_api_instance, mock_api_instance)

    result = await server_account.request_faucet(network="base-sepolia", token="eth")

    mock_faucets_api.request_evm_faucet.assert_called_once_with(
        request_evm_faucet_request=RequestEvmFaucetRequest(
            network="base-sepolia",
            token="eth",
            address=address,
        ),
    )
    assert result == "0x123"


@pytest.mark.asyncio
@patch("cdp.evm_server_account.EVMAccountsApi")
async def test_send_transaction_serialized(mock_api, server_account_model_factory):
    """Test send_transaction method with serialized transaction."""
    address = "0x1234567890123456789012345678901234567890"
    name = "test-account"
    server_account_model = server_account_model_factory(address, name)
    mock_api_instance = mock_api.return_value
    mock_api_instance.send_evm_transaction = AsyncMock(
        return_value=SendEvmTransaction200Response(transaction_hash="0x123")
    )
    server_account = EvmServerAccount(server_account_model, mock_api_instance, mock_api_instance)

    test_network = "base-sepolia"
    test_transaction = "0xabcdef"

    result = await server_account.send_transaction(
        network=test_network,
        transaction=test_transaction,
    )

    mock_api_instance.send_evm_transaction.assert_called_once_with(
        address=server_account.address,
        send_evm_transaction_request=SendEvmTransactionRequest(
            transaction=test_transaction, network=test_network
        ),
        x_idempotency_key=None,
    )
    assert result == "0x123"


@pytest.mark.asyncio
@patch("cdp.evm_server_account.EVMAccountsApi")
async def test_send_transaction_eip1559(mock_api, server_account_model_factory):
    """Test send_transaction method with EIP-1559 transaction."""
    address = "0x1234567890123456789012345678901234567890"
    name = "test-account"
    server_account_model = server_account_model_factory(address, name)
    mock_api_instance = mock_api.return_value
    mock_api_instance.send_evm_transaction = AsyncMock(
        return_value=SendEvmTransaction200Response(transaction_hash="0x456")
    )
    server_account = EvmServerAccount(server_account_model, mock_api_instance, mock_api_instance)

    w3 = Web3()

    test_network = "base-sepolia"
    test_transaction = TransactionRequestEIP1559(
        to="0x1234567890123456789012345678901234567890",
        value=w3.to_wei(0.000001, "ether"),
    )

    result = await server_account.send_transaction(
        network=test_network,
        transaction=test_transaction,
    )

    mock_api_instance.send_evm_transaction.assert_called_once_with(
        address=server_account.address,
        send_evm_transaction_request=SendEvmTransactionRequest(
            transaction="0x02e5808080808094123456789012345678901234567890123456789085e8d4a5100080c0808080",
            network=test_network,
        ),
        x_idempotency_key=None,
    )
    assert result == "0x456"


@pytest.mark.asyncio
@patch("cdp.evm_server_account.EVMAccountsApi")
async def test_send_transaction_dynamic_fee(mock_api, server_account_model_factory):
    """Test send_transaction method with dynamic fee transaction."""
    address = "0x1234567890123456789012345678901234567890"
    name = "test-account"
    server_account_model = server_account_model_factory(address, name)
    mock_api_instance = mock_api.return_value
    mock_api_instance.send_evm_transaction = AsyncMock(
        return_value=SendEvmTransaction200Response(transaction_hash="0x789")
    )
    server_account = EvmServerAccount(server_account_model, mock_api_instance, mock_api_instance)

    w3 = Web3()

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

    result = await server_account.send_transaction(
        network=test_network,
        transaction=test_transaction,
    )

    mock_api_instance.send_evm_transaction.assert_called_once_with(
        address=server_account.address,
        send_evm_transaction_request=SendEvmTransactionRequest(
            transaction="0x02f78001880de0b6b3a7640000880de0b6b3a764000082520894123456789012345678901234567890123456789085e8d4a5100080c0808080",
            network=test_network,
        ),
        x_idempotency_key=None,
    )
    assert result == "0x789"


@pytest.mark.asyncio
async def test_list_token_balances(server_account_model_factory, evm_token_balances_model_factory):
    """Test list_token_balances method."""
    address = "0x1234567890123456789012345678901234567890"
    name = "test-account"
    server_account_model = server_account_model_factory(address, name)

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

    server_account = EvmServerAccount(server_account_model, mock_api_clients, mock_api_clients)

    result = await server_account.list_token_balances(network="base-sepolia")

    mock_evm_token_balances_api.list_evm_token_balances.assert_called_once_with(
        address=address, network="base-sepolia", page_size=None, page_token=None
    )

    assert result == expected_result


@pytest.mark.asyncio
async def test_quote_fund_transfer_usdc_on_base(
    server_account_model_factory, payment_transfer_model_factory, payment_method_model_factory
):
    """Test quote_fund method."""
    address = "0x1234567890123456789012345678901234567890"
    name = "test-account"
    server_account_model = server_account_model_factory(address, name)
    payment_transfer = payment_transfer_model_factory()
    payment_method = payment_method_model_factory()

    mock_payments_api = AsyncMock()

    mock_api_clients = AsyncMock(spec=ApiClients)
    mock_api_clients.payments = mock_payments_api

    mock_payments_api.get_payment_methods = AsyncMock(return_value=[payment_method])

    mock_payments_api.create_payment_transfer_quote = AsyncMock(
        return_value=CreatePaymentTransferQuote201Response(transfer=payment_transfer)
    )

    server_account = EvmServerAccount(server_account_model, mock_api_clients, mock_api_clients)
    # 1 USDC
    result = await server_account.quote_fund(network="base", token="usdc", amount=1000000)

    mock_payments_api.get_payment_methods.assert_called_once()

    mock_payments_api.create_payment_transfer_quote.assert_called_once()
    call_args = mock_payments_api.create_payment_transfer_quote.call_args[1]
    assert call_args["create_payment_transfer_quote_request"].source_type == "payment_method"
    assert call_args["create_payment_transfer_quote_request"].target_type == "crypto_rail"
    assert call_args["create_payment_transfer_quote_request"].amount == "1"
    assert call_args["create_payment_transfer_quote_request"].currency == "usdc"

    assert isinstance(result, Quote)
    assert result.quote_id == payment_transfer.id
    assert result.network == "base"
    assert result.token == "usdc"
    assert result.fiat_amount == "1"
    assert result.fiat_currency == "usd"
    assert result.token_amount == "1"
    assert result.token == "usdc"
    assert result.fees == []


@pytest.mark.asyncio
async def test_quote_fund_transfer_eth_on_base(
    server_account_model_factory, payment_transfer_model_factory, payment_method_model_factory
):
    """Test quote_fund method."""
    address = "0x1234567890123456789012345678901234567890"
    name = "test-account"
    server_account_model = server_account_model_factory(address, name)
    payment_transfer = payment_transfer_model_factory(
        source_amount="1000", source_currency="usd", target_amount="1.1", target_currency="eth"
    )
    payment_method = payment_method_model_factory()

    mock_payments_api = AsyncMock()

    mock_api_clients = AsyncMock(spec=ApiClients)
    mock_api_clients.payments = mock_payments_api

    mock_payments_api.get_payment_methods = AsyncMock(return_value=[payment_method])

    mock_payments_api.create_payment_transfer_quote = AsyncMock(
        return_value=CreatePaymentTransferQuote201Response(transfer=payment_transfer)
    )

    server_account = EvmServerAccount(server_account_model, mock_api_clients, mock_api_clients)
    # 1.1 ETH
    result = await server_account.quote_fund(
        network="base", token="eth", amount=1100000000000000000
    )

    mock_payments_api.get_payment_methods.assert_called_once()

    mock_payments_api.create_payment_transfer_quote.assert_called_once()
    call_args = mock_payments_api.create_payment_transfer_quote.call_args[1]
    assert call_args["create_payment_transfer_quote_request"].source_type == "payment_method"
    assert call_args["create_payment_transfer_quote_request"].target_type == "crypto_rail"
    assert call_args["create_payment_transfer_quote_request"].amount == "1.1"
    assert call_args["create_payment_transfer_quote_request"].currency == "eth"

    assert isinstance(result, Quote)
    assert result.quote_id == payment_transfer.id
    assert result.network == "base"
    assert result.token == "eth"
    assert result.fiat_amount == "1000"
    assert result.fiat_currency == "usd"
    assert result.token_amount == "1.1"
    assert result.token == "eth"
    assert result.fees == []


@pytest.mark.asyncio
async def test_quote_fund_transfer_usdc_on_ethereum(
    server_account_model_factory, payment_transfer_model_factory, payment_method_model_factory
):
    """Test quote_fund method."""
    address = "0x1234567890123456789012345678901234567890"
    name = "test-account"
    server_account_model = server_account_model_factory(address, name)
    payment_transfer = payment_transfer_model_factory()
    payment_method = payment_method_model_factory()

    mock_payments_api = AsyncMock()

    mock_api_clients = AsyncMock(spec=ApiClients)
    mock_api_clients.payments = mock_payments_api

    mock_payments_api.get_payment_methods = AsyncMock(return_value=[payment_method])

    mock_payments_api.create_payment_transfer_quote = AsyncMock(
        return_value=CreatePaymentTransferQuote201Response(transfer=payment_transfer)
    )

    server_account = EvmServerAccount(server_account_model, mock_api_clients, mock_api_clients)
    # 1 USDC
    result = await server_account.quote_fund(network="ethereum", token="usdc", amount=1000000)

    mock_payments_api.get_payment_methods.assert_called_once()

    mock_payments_api.create_payment_transfer_quote.assert_called_once()
    call_args = mock_payments_api.create_payment_transfer_quote.call_args[1]
    assert call_args["create_payment_transfer_quote_request"].source_type == "payment_method"
    assert call_args["create_payment_transfer_quote_request"].target_type == "crypto_rail"
    assert call_args["create_payment_transfer_quote_request"].amount == "1"
    assert call_args["create_payment_transfer_quote_request"].currency == "usdc"

    assert isinstance(result, Quote)
    assert result.quote_id == payment_transfer.id
    assert result.network == "ethereum"
    assert result.token == "usdc"
    assert result.fiat_amount == "1"
    assert result.fiat_currency == "usd"
    assert result.token_amount == "1"
    assert result.token == "usdc"
    assert result.fees == []


@pytest.mark.asyncio
async def test_quote_fund_transfer_eth_on_ethereum(
    server_account_model_factory, payment_transfer_model_factory, payment_method_model_factory
):
    """Test quote_fund method."""
    address = "0x1234567890123456789012345678901234567890"
    name = "test-account"
    server_account_model = server_account_model_factory(address, name)
    payment_transfer = payment_transfer_model_factory(
        source_amount="1000", source_currency="usd", target_amount="1.1", target_currency="eth"
    )
    payment_method = payment_method_model_factory()

    mock_payments_api = AsyncMock()

    mock_api_clients = AsyncMock(spec=ApiClients)
    mock_api_clients.payments = mock_payments_api

    mock_payments_api.get_payment_methods = AsyncMock(return_value=[payment_method])

    mock_payments_api.create_payment_transfer_quote = AsyncMock(
        return_value=CreatePaymentTransferQuote201Response(transfer=payment_transfer)
    )

    server_account = EvmServerAccount(server_account_model, mock_api_clients, mock_api_clients)
    # 1.1 ETH
    result = await server_account.quote_fund(
        network="ethereum", token="eth", amount=1100000000000000000
    )

    mock_payments_api.get_payment_methods.assert_called_once()

    mock_payments_api.create_payment_transfer_quote.assert_called_once()
    call_args = mock_payments_api.create_payment_transfer_quote.call_args[1]
    assert call_args["create_payment_transfer_quote_request"].source_type == "payment_method"
    assert call_args["create_payment_transfer_quote_request"].target_type == "crypto_rail"
    assert call_args["create_payment_transfer_quote_request"].amount == "1.1"
    assert call_args["create_payment_transfer_quote_request"].currency == "eth"

    assert isinstance(result, Quote)
    assert result.quote_id == payment_transfer.id
    assert result.network == "ethereum"
    assert result.token == "eth"
    assert result.fiat_amount == "1000"
    assert result.fiat_currency == "usd"
    assert result.token_amount == "1.1"
    assert result.token == "eth"
    assert result.fees == []


@pytest.mark.asyncio
async def test_fund_transfer_eth_on_base(
    server_account_model_factory, payment_transfer_model_factory, payment_method_model_factory
):
    """Test fund method."""
    address = "0x1234567890123456789012345678901234567890"
    name = "test-account"
    server_account_model = server_account_model_factory(address, name)
    payment_transfer = payment_transfer_model_factory(
        source_amount="1000", source_currency="usd", target_amount="1.1", target_currency="eth"
    )
    payment_method = payment_method_model_factory()

    mock_payments_api = AsyncMock()

    mock_api_clients = AsyncMock(spec=ApiClients)
    mock_api_clients.payments = mock_payments_api

    mock_payments_api.get_payment_methods = AsyncMock(return_value=[payment_method])

    mock_payments_api.create_payment_transfer_quote = AsyncMock(
        return_value=CreatePaymentTransferQuote201Response(transfer=payment_transfer)
    )

    server_account = EvmServerAccount(server_account_model, mock_api_clients, mock_api_clients)
    # 1.1 ETH
    result = await server_account.fund(network="base", token="eth", amount=1100000000000000000)

    mock_payments_api.get_payment_methods.assert_called_once()

    mock_payments_api.create_payment_transfer_quote.assert_called_once()
    call_args = mock_payments_api.create_payment_transfer_quote.call_args[1]
    assert call_args["create_payment_transfer_quote_request"].source_type == "payment_method"
    assert call_args["create_payment_transfer_quote_request"].target_type == "crypto_rail"
    assert call_args["create_payment_transfer_quote_request"].amount == "1.1"
    assert call_args["create_payment_transfer_quote_request"].currency == "eth"
    assert call_args["create_payment_transfer_quote_request"].execute is True

    assert result.id == payment_transfer.id
    assert result.network == payment_transfer.target.actual_instance.network
    assert result.target_amount == payment_transfer.target_amount
    assert result.target_currency == payment_transfer.target_currency
    assert result.status == payment_transfer.status
    assert result.transaction_hash == payment_transfer.transaction_hash


@pytest.mark.asyncio
async def test_fund_transfer_usdc_on_base(
    server_account_model_factory, payment_transfer_model_factory, payment_method_model_factory
):
    """Test fund method with USDC."""
    address = "0x1234567890123456789012345678901234567890"
    name = "test-account"
    server_account_model = server_account_model_factory(address, name)
    payment_transfer = payment_transfer_model_factory(
        source_amount="1", source_currency="usd", target_amount="1", target_currency="usdc"
    )
    payment_method = payment_method_model_factory()

    mock_payments_api = AsyncMock()

    mock_api_clients = AsyncMock(spec=ApiClients)
    mock_api_clients.payments = mock_payments_api

    mock_payments_api.get_payment_methods = AsyncMock(return_value=[payment_method])

    mock_payments_api.create_payment_transfer_quote = AsyncMock(
        return_value=CreatePaymentTransferQuote201Response(transfer=payment_transfer)
    )

    server_account = EvmServerAccount(server_account_model, mock_api_clients, mock_api_clients)
    # 1 USDC (6 decimals)
    result = await server_account.fund(network="base", token="usdc", amount=1000000)

    mock_payments_api.get_payment_methods.assert_called_once()

    mock_payments_api.create_payment_transfer_quote.assert_called_once()
    call_args = mock_payments_api.create_payment_transfer_quote.call_args[1]
    assert call_args["create_payment_transfer_quote_request"].source_type == "payment_method"
    assert call_args["create_payment_transfer_quote_request"].target_type == "crypto_rail"
    assert call_args["create_payment_transfer_quote_request"].amount == "1"
    assert call_args["create_payment_transfer_quote_request"].currency == "usdc"
    assert call_args["create_payment_transfer_quote_request"].execute is True

    assert result.id == payment_transfer.id
    assert result.network == payment_transfer.target.actual_instance.network
    assert result.target_amount == payment_transfer.target_amount
    assert result.target_currency == payment_transfer.target_currency
    assert result.status == payment_transfer.status
    assert result.transaction_hash == payment_transfer.transaction_hash


@pytest.mark.asyncio
async def test_fund_transfer_eth_on_ethereum(
    server_account_model_factory, payment_transfer_model_factory, payment_method_model_factory
):
    """Test fund method."""
    address = "0x1234567890123456789012345678901234567890"
    name = "test-account"
    server_account_model = server_account_model_factory(address, name)
    payment_transfer = payment_transfer_model_factory(
        source_amount="1000", source_currency="usd", target_amount="1.1", target_currency="eth"
    )
    payment_method = payment_method_model_factory()

    mock_payments_api = AsyncMock()

    mock_api_clients = AsyncMock(spec=ApiClients)
    mock_api_clients.payments = mock_payments_api

    mock_payments_api.get_payment_methods = AsyncMock(return_value=[payment_method])

    mock_payments_api.create_payment_transfer_quote = AsyncMock(
        return_value=CreatePaymentTransferQuote201Response(transfer=payment_transfer)
    )

    server_account = EvmServerAccount(server_account_model, mock_api_clients, mock_api_clients)
    # 1.1 ETH
    result = await server_account.fund(network="ethereum", token="eth", amount=1100000000000000000)

    mock_payments_api.get_payment_methods.assert_called_once()

    mock_payments_api.create_payment_transfer_quote.assert_called_once()
    call_args = mock_payments_api.create_payment_transfer_quote.call_args[1]
    assert call_args["create_payment_transfer_quote_request"].source_type == "payment_method"
    assert call_args["create_payment_transfer_quote_request"].target_type == "crypto_rail"
    assert call_args["create_payment_transfer_quote_request"].amount == "1.1"
    assert call_args["create_payment_transfer_quote_request"].currency == "eth"
    assert call_args["create_payment_transfer_quote_request"].execute is True

    assert result.id == payment_transfer.id
    assert result.network == payment_transfer.target.actual_instance.network
    assert result.target_amount == payment_transfer.target_amount
    assert result.target_currency == payment_transfer.target_currency
    assert result.status == payment_transfer.status
    assert result.transaction_hash == payment_transfer.transaction_hash


@pytest.mark.asyncio
async def test_fund_transfer_usdc_on_ethereum(
    server_account_model_factory, payment_transfer_model_factory, payment_method_model_factory
):
    """Test fund method with USDC."""
    address = "0x1234567890123456789012345678901234567890"
    name = "test-account"
    server_account_model = server_account_model_factory(address, name)
    payment_transfer = payment_transfer_model_factory(
        source_amount="1", source_currency="usd", target_amount="1", target_currency="usdc"
    )
    payment_method = payment_method_model_factory()

    mock_payments_api = AsyncMock()

    mock_api_clients = AsyncMock(spec=ApiClients)
    mock_api_clients.payments = mock_payments_api

    mock_payments_api.get_payment_methods = AsyncMock(return_value=[payment_method])

    mock_payments_api.create_payment_transfer_quote = AsyncMock(
        return_value=CreatePaymentTransferQuote201Response(transfer=payment_transfer)
    )

    server_account = EvmServerAccount(server_account_model, mock_api_clients, mock_api_clients)
    # 1 USDC (6 decimals)
    result = await server_account.fund(network="ethereum", token="usdc", amount=1000000)

    mock_payments_api.get_payment_methods.assert_called_once()

    mock_payments_api.create_payment_transfer_quote.assert_called_once()
    call_args = mock_payments_api.create_payment_transfer_quote.call_args[1]
    assert call_args["create_payment_transfer_quote_request"].source_type == "payment_method"
    assert call_args["create_payment_transfer_quote_request"].target_type == "crypto_rail"
    assert call_args["create_payment_transfer_quote_request"].amount == "1"
    assert call_args["create_payment_transfer_quote_request"].currency == "usdc"
    assert call_args["create_payment_transfer_quote_request"].execute is True

    assert result.id == payment_transfer.id
    assert result.network == payment_transfer.target.actual_instance.network
    assert result.target_amount == payment_transfer.target_amount
    assert result.target_currency == payment_transfer.target_currency
    assert result.status == payment_transfer.status
    assert result.transaction_hash == payment_transfer.transaction_hash


@pytest.mark.asyncio
async def test_wait_for_fund_operation_receipt_success(
    server_account_model_factory, payment_transfer_model_factory
):
    """Test wait_for_fund_operation_receipt method with successful completion."""
    address = "0x1234567890123456789012345678901234567890"
    name = "test-account"
    server_account_model = server_account_model_factory(address, name)

    mock_payments_api = AsyncMock()
    mock_api_clients = AsyncMock(spec=ApiClients)
    mock_api_clients.payments = mock_payments_api

    completed_transfer = payment_transfer_model_factory(status="completed")
    mock_payments_api.get_payment_transfer = AsyncMock(return_value=completed_transfer)

    server_account = EvmServerAccount(server_account_model, mock_api_clients, mock_api_clients)
    result = await server_account.wait_for_fund_operation_receipt(transfer_id="test-transfer-id")

    assert result == completed_transfer
    mock_payments_api.get_payment_transfer.assert_called_once_with("test-transfer-id")


@pytest.mark.asyncio
async def test_wait_for_fund_operation_receipt_failure(
    server_account_model_factory, payment_transfer_model_factory
):
    """Test wait_for_fund_operation_receipt method with failed transfer."""
    address = "0x1234567890123456789012345678901234567890"
    name = "test-account"
    server_account_model = server_account_model_factory(address, name)

    mock_payments_api = AsyncMock()
    mock_api_clients = AsyncMock(spec=ApiClients)
    mock_api_clients.payments = mock_payments_api

    failed_transfer = payment_transfer_model_factory(status="failed")
    mock_payments_api.get_payment_transfer = AsyncMock(return_value=failed_transfer)

    server_account = EvmServerAccount(server_account_model, mock_api_clients, mock_api_clients)
    result = await server_account.wait_for_fund_operation_receipt(transfer_id="test-transfer-id")

    assert result == failed_transfer
    mock_payments_api.get_payment_transfer.assert_called_once_with("test-transfer-id")


@pytest.mark.asyncio
async def test_wait_for_fund_operation_receipt_timeout(
    server_account_model_factory, payment_transfer_model_factory
):
    """Test wait_for_fund_operation_receipt method with timeout."""
    address = "0x1234567890123456789012345678901234567890"
    name = "test-account"
    server_account_model = server_account_model_factory(address, name)

    mock_payments_api = AsyncMock()
    mock_api_clients = AsyncMock(spec=ApiClients)
    mock_api_clients.payments = mock_payments_api

    pending_transfer = payment_transfer_model_factory(status="pending")
    mock_payments_api.get_payment_transfer = AsyncMock(return_value=pending_transfer)

    server_account = EvmServerAccount(server_account_model, mock_api_clients, mock_api_clients)

    with pytest.raises(TimeoutError):
        await server_account.wait_for_fund_operation_receipt(
            transfer_id="test-transfer-id", timeout_seconds=0.1, interval_seconds=0.1
        )
