from unittest.mock import AsyncMock, MagicMock

import pytest

from cdp.actions.quote import SolanaQuote
from cdp.actions.types import FundOperationResult
from cdp.api_clients import ApiClients
from cdp.openapi_client.models.create_payment_transfer_quote_request import (
    CreatePaymentTransferQuoteRequest,
)
from cdp.openapi_client.models.crypto_rail_address import CryptoRailAddress
from cdp.openapi_client.models.fee import Fee
from cdp.openapi_client.models.payment_method import PaymentMethod
from cdp.openapi_client.models.payment_method_request import PaymentMethodRequest
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
from cdp.openapi_client.models.transfer import Transfer
from cdp.openapi_client.models.transfer_source import TransferSource
from cdp.openapi_client.models.transfer_target import TransferTarget
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


@pytest.mark.asyncio
async def test_quote_fund_with_sol():
    """Test quote_fund method."""
    address = "14grJpemFaf88c8tiVb77W7TYg2W3ir6pfkKz3YjhhZ5"
    name = "test-account"
    solana_account_model = SolanaAccountModel(address=address, name=name)

    mock_api_clients = MagicMock(spec=ApiClients)
    mock_payments_api = MagicMock()
    mock_api_clients.payments = mock_payments_api
    account = SolanaAccount(solana_account_model, mock_api_clients)
    mock_payment_method = PaymentMethod(
        id="01234567-abcd-9012-efab-345678901234",
        type="card",
        actions=["source"],
        currency="usd",
    )
    mock_transfer = Transfer(
        id="12345678-abcd-9012-efab-345678901234",
        source_type="payment_method",
        source=TransferSource(PaymentMethodRequest(id="01234567-abcd-9012-efab-345678901234")),
        target_type="crypto_rail",
        target=TransferTarget(
            CryptoRailAddress(
                currency="sol",
                network="solana",
                address=address,
            ),
        ),
        source_amount="0.001",
        source_currency="sol",
        target_amount="1",
        target_currency="usd",
        user_amount="0.001",
        user_currency="sol",
        fees=[
            Fee(type="network_fee", amount="0.01", currency="usd"),
            Fee(type="exchange_fee", amount="0.01", currency="usd"),
        ],
        status="completed",
        created_at="2021-01-01T00:00:00Z",
        updated_at="2021-01-01T00:00:00Z",
        transaction_hash="test_transaction_hash",
    )
    mock_response = MagicMock()
    mock_response.transfer = mock_transfer

    mock_api_clients.payments.get_payment_methods = AsyncMock(return_value=[mock_payment_method])
    mock_api_clients.payments.create_payment_transfer_quote = AsyncMock(return_value=mock_response)

    result = await account.quote_fund(token="sol", amount=1000000)

    mock_api_clients.payments.get_payment_methods.assert_called_once()
    mock_api_clients.payments.create_payment_transfer_quote.assert_called_once_with(
        create_payment_transfer_quote_request=CreatePaymentTransferQuoteRequest(
            source_type="payment_method",
            source=TransferSource(PaymentMethodRequest(id="01234567-abcd-9012-efab-345678901234")),
            target_type="crypto_rail",
            target=TransferTarget(
                CryptoRailAddress(
                    currency="sol",
                    network="solana",
                    address=address,
                ),
            ),
            amount="0.001",
            currency="sol",
        )
    )

    assert result == SolanaQuote(
        api_clients=mock_api_clients,
        quote_id=mock_transfer.id,
        network="solana",
        fiat_amount=mock_transfer.source_amount,
        fiat_currency=mock_transfer.source_currency,
        token_amount=mock_transfer.target_amount,
        token=mock_transfer.target_currency,
        fees=mock_transfer.fees,
    )


@pytest.mark.asyncio
async def test_quote_fund_with_usdc():
    """Test quote_fund method."""
    address = "14grJpemFaf88c8tiVb77W7TYg2W3ir6pfkKz3YjhhZ5"
    name = "test-account"
    solana_account_model = SolanaAccountModel(address=address, name=name)

    mock_api_clients = MagicMock(spec=ApiClients)
    mock_payments_api = MagicMock()
    mock_api_clients.payments = mock_payments_api
    account = SolanaAccount(solana_account_model, mock_api_clients)
    mock_payment_method = PaymentMethod(
        id="01234567-abcd-9012-efab-345678901234",
        type="card",
        actions=["source"],
        currency="usd",
    )
    mock_transfer = Transfer(
        id="12345678-abcd-9012-efab-345678901234",
        source_type="payment_method",
        source=TransferSource(PaymentMethodRequest(id="01234567-abcd-9012-efab-345678901234")),
        target_type="crypto_rail",
        target=TransferTarget(
            CryptoRailAddress(
                currency="usdc",
                network="solana",
                address=address,
            ),
        ),
        source_amount="1",
        source_currency="usdc",
        target_amount="1",
        target_currency="usd",
        user_amount="1",
        user_currency="usdc",
        fees=[
            Fee(type="network_fee", amount="0.01", currency="usd"),
            Fee(type="exchange_fee", amount="0.01", currency="usd"),
        ],
        status="completed",
        created_at="2021-01-01T00:00:00Z",
        updated_at="2021-01-01T00:00:00Z",
        transaction_hash="test_transaction_hash",
    )
    mock_response = MagicMock()
    mock_response.transfer = mock_transfer

    mock_api_clients.payments.get_payment_methods = AsyncMock(return_value=[mock_payment_method])
    mock_api_clients.payments.create_payment_transfer_quote = AsyncMock(return_value=mock_response)

    result = await account.quote_fund(token="usdc", amount=1000000)

    mock_api_clients.payments.get_payment_methods.assert_called_once()
    mock_api_clients.payments.create_payment_transfer_quote.assert_called_once_with(
        create_payment_transfer_quote_request=CreatePaymentTransferQuoteRequest(
            source_type="payment_method",
            source=TransferSource(PaymentMethodRequest(id="01234567-abcd-9012-efab-345678901234")),
            target_type="crypto_rail",
            target=TransferTarget(
                CryptoRailAddress(
                    currency="usdc",
                    network="solana",
                    address=address,
                ),
            ),
            amount="1",
            currency="usdc",
        )
    )

    assert result == SolanaQuote(
        api_clients=mock_api_clients,
        quote_id=mock_transfer.id,
        network="solana",
        fiat_amount=mock_transfer.source_amount,
        fiat_currency=mock_transfer.source_currency,
        token_amount=mock_transfer.target_amount,
        token=mock_transfer.target_currency,
        fees=mock_transfer.fees,
    )


@pytest.mark.asyncio
async def test_quote_fund_with_no_card():
    """Test quote_fund method."""
    address = "14grJpemFaf88c8tiVb77W7TYg2W3ir6pfkKz3YjhhZ5"
    name = "test-account"
    solana_account_model = SolanaAccountModel(address=address, name=name)

    mock_api_clients = MagicMock(spec=ApiClients)
    mock_payments_api = MagicMock()
    mock_api_clients.payments = mock_payments_api
    account = SolanaAccount(solana_account_model, mock_api_clients)

    mock_api_clients.payments.get_payment_methods = AsyncMock(return_value=[])

    with pytest.raises(ValueError) as exc_info:
        await account.quote_fund(token="sol", amount=1000000)

    assert str(exc_info.value) == "No card found to fund account"


@pytest.mark.asyncio
async def test_fund_with_sol():
    """Test fund method."""
    address = "14grJpemFaf88c8tiVb77W7TYg2W3ir6pfkKz3YjhhZ5"
    name = "test-account"
    solana_account_model = SolanaAccountModel(address=address, name=name)

    mock_api_clients = MagicMock(spec=ApiClients)
    mock_payments_api = MagicMock()
    mock_api_clients.payments = mock_payments_api
    account = SolanaAccount(solana_account_model, mock_api_clients)
    mock_payment_method = PaymentMethod(
        id="01234567-abcd-9012-efab-345678901234",
        type="card",
        actions=["source"],
        currency="usd",
    )
    mock_transfer = Transfer(
        id="12345678-abcd-9012-efab-345678901234",
        source_type="payment_method",
        source=TransferSource(PaymentMethodRequest(id="01234567-abcd-9012-efab-345678901234")),
        target_type="crypto_rail",
        target=TransferTarget(
            CryptoRailAddress(
                currency="sol",
                network="solana",
                address=address,
            ),
        ),
        source_amount="0.001",
        source_currency="sol",
        target_amount="1",
        target_currency="usd",
        user_amount="0.001",
        user_currency="sol",
        fees=[
            Fee(type="network_fee", amount="0.01", currency="usd"),
            Fee(type="exchange_fee", amount="0.01", currency="usd"),
        ],
        status="completed",
        created_at="2021-01-01T00:00:00Z",
        updated_at="2021-01-01T00:00:00Z",
        transaction_hash="test_transaction_hash",
    )
    mock_response = MagicMock()
    mock_response.transfer = mock_transfer

    mock_api_clients.payments.get_payment_methods = AsyncMock(return_value=[mock_payment_method])
    mock_api_clients.payments.create_payment_transfer_quote = AsyncMock(return_value=mock_response)

    result = await account.fund(token="sol", amount=1000000)

    mock_api_clients.payments.get_payment_methods.assert_called_once()
    mock_api_clients.payments.create_payment_transfer_quote.assert_called_once_with(
        create_payment_transfer_quote_request=CreatePaymentTransferQuoteRequest(
            source_type="payment_method",
            source=TransferSource(PaymentMethodRequest(id="01234567-abcd-9012-efab-345678901234")),
            target_type="crypto_rail",
            target=TransferTarget(
                CryptoRailAddress(
                    currency="sol",
                    network="solana",
                    address=address,
                ),
            ),
            amount="0.001",
            currency="sol",
            execute=True,
        )
    )
    assert result == FundOperationResult(
        id=mock_transfer.id,
        network=mock_transfer.target.actual_instance.network,
        target_amount=mock_transfer.target_amount,
        target_currency=mock_transfer.target_currency,
        status=mock_transfer.status,
        transaction_hash=mock_transfer.transaction_hash,
    )


@pytest.mark.asyncio
async def test_fund_with_usdc():
    """Test fund method."""
    address = "14grJpemFaf88c8tiVb77W7TYg2W3ir6pfkKz3YjhhZ5"
    name = "test-account"
    solana_account_model = SolanaAccountModel(address=address, name=name)

    mock_api_clients = MagicMock(spec=ApiClients)
    mock_payments_api = MagicMock()
    mock_api_clients.payments = mock_payments_api
    account = SolanaAccount(solana_account_model, mock_api_clients)
    mock_payment_method = PaymentMethod(
        id="01234567-abcd-9012-efab-345678901234",
        type="card",
        actions=["source"],
        currency="usd",
    )
    mock_transfer = Transfer(
        id="12345678-abcd-9012-efab-345678901234",
        source_type="payment_method",
        source=TransferSource(PaymentMethodRequest(id="01234567-abcd-9012-efab-345678901234")),
        target_type="crypto_rail",
        target=TransferTarget(
            CryptoRailAddress(
                currency="usdc",
                network="solana",
                address=address,
            ),
        ),
        source_amount="1",
        source_currency="usdc",
        target_amount="1",
        target_currency="usd",
        user_amount="1",
        user_currency="usdc",
        fees=[
            Fee(type="network_fee", amount="0.01", currency="usd"),
            Fee(type="exchange_fee", amount="0.01", currency="usd"),
        ],
        status="completed",
        created_at="2021-01-01T00:00:00Z",
        updated_at="2021-01-01T00:00:00Z",
        transaction_hash="test_transaction_hash",
    )
    mock_response = MagicMock()
    mock_response.transfer = mock_transfer

    mock_api_clients.payments.get_payment_methods = AsyncMock(return_value=[mock_payment_method])
    mock_api_clients.payments.create_payment_transfer_quote = AsyncMock(return_value=mock_response)

    result = await account.fund(token="usdc", amount=1000000)

    mock_api_clients.payments.get_payment_methods.assert_called_once()
    mock_api_clients.payments.create_payment_transfer_quote.assert_called_once_with(
        create_payment_transfer_quote_request=CreatePaymentTransferQuoteRequest(
            source_type="payment_method",
            source=TransferSource(PaymentMethodRequest(id="01234567-abcd-9012-efab-345678901234")),
            target_type="crypto_rail",
            target=TransferTarget(
                CryptoRailAddress(
                    currency="usdc",
                    network="solana",
                    address=address,
                ),
            ),
            amount="1",
            currency="usdc",
            execute=True,
        )
    )

    assert result == FundOperationResult(
        id=mock_transfer.id,
        network=mock_transfer.target.actual_instance.network,
        target_amount=mock_transfer.target_amount,
        target_currency=mock_transfer.target_currency,
        status=mock_transfer.status,
        transaction_hash=mock_transfer.transaction_hash,
    )


@pytest.mark.asyncio
async def test_fund_with_no_card():
    """Test fund method."""
    address = "14grJpemFaf88c8tiVb77W7TYg2W3ir6pfkKz3YjhhZ5"
    name = "test-account"
    solana_account_model = SolanaAccountModel(address=address, name=name)

    mock_api_clients = MagicMock(spec=ApiClients)
    mock_payments_api = MagicMock()
    mock_api_clients.payments = mock_payments_api
    account = SolanaAccount(solana_account_model, mock_api_clients)

    mock_api_clients.payments.get_payment_methods = AsyncMock(return_value=[])

    with pytest.raises(ValueError) as exc_info:
        await account.fund(token="sol", amount=1000000)

    assert str(exc_info.value) == "No card found to fund account"


@pytest.mark.asyncio
async def test_wait_for_fund_operation_receipt_success(payment_transfer_model_factory):
    """Test wait_for_fund_operation_receipt method."""
    address = "14grJpemFaf88c8tiVb77W7TYg2W3ir6pfkKz3YjhhZ5"
    name = "test-account"
    solana_account_model = SolanaAccountModel(address=address, name=name)

    mock_api_clients = MagicMock(spec=ApiClients)
    mock_payments_api = MagicMock()
    mock_api_clients.payments = mock_payments_api
    account = SolanaAccount(solana_account_model, mock_api_clients)

    mock_transfer = payment_transfer_model_factory(status="completed")
    mock_api_clients.payments.get_payment_transfer = AsyncMock(return_value=mock_transfer)

    result = await account.wait_for_fund_operation_receipt(transfer_id="test-transfer-id")

    assert result == mock_transfer
    mock_api_clients.payments.get_payment_transfer.assert_called_once_with("test-transfer-id")


@pytest.mark.asyncio
async def test_wait_for_fund_operation_receipt_failure(payment_transfer_model_factory):
    """Test wait_for_fund_operation_receipt method."""
    address = "14grJpemFaf88c8tiVb77W7TYg2W3ir6pfkKz3YjhhZ5"
    name = "test-account"
    solana_account_model = SolanaAccountModel(address=address, name=name)

    mock_api_clients = MagicMock(spec=ApiClients)
    mock_payments_api = MagicMock()
    mock_api_clients.payments = mock_payments_api
    account = SolanaAccount(solana_account_model, mock_api_clients)

    mock_transfer = payment_transfer_model_factory(status="failed")
    mock_api_clients.payments.get_payment_transfer = AsyncMock(return_value=mock_transfer)

    result = await account.wait_for_fund_operation_receipt(transfer_id="test-transfer-id")

    assert result == mock_transfer
    mock_api_clients.payments.get_payment_transfer.assert_called_once_with("test-transfer-id")


@pytest.mark.asyncio
async def test_wait_for_fund_operation_receipt_timeout(payment_transfer_model_factory):
    """Test wait_for_fund_operation_receipt method."""
    address = "14grJpemFaf88c8tiVb77W7TYg2W3ir6pfkKz3YjhhZ5"
    name = "test-account"
    solana_account_model = SolanaAccountModel(address=address, name=name)

    mock_api_clients = MagicMock(spec=ApiClients)
    mock_payments_api = MagicMock()
    mock_api_clients.payments = mock_payments_api
    account = SolanaAccount(solana_account_model, mock_api_clients)

    mock_transfer = payment_transfer_model_factory(status="pending")
    mock_api_clients.payments.get_payment_transfer = AsyncMock(return_value=mock_transfer)

    with pytest.raises(TimeoutError) as exc_info:
        await account.wait_for_fund_operation_receipt(
            transfer_id="test-transfer-id",
            timeout_seconds=0.1,
            interval_seconds=0.1,
        )

    assert str(exc_info.value) == "Transfer timed out"
    mock_api_clients.payments.get_payment_transfer.assert_called_with("test-transfer-id")
