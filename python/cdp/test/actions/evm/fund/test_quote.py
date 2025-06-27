from unittest.mock import AsyncMock, MagicMock

import pytest

from cdp.actions.evm.fund.quote import Quote
from cdp.actions.evm.fund.types import FundOperationResult
from cdp.api_clients import ApiClients
from cdp.openapi_client.models.fee import Fee


def test_quote_initialization():
    """Test quote initialization with valid parameters."""
    valid_quote = Quote(
        api_clients=MagicMock(spec=ApiClients),
        quote_id="test-quote-id",
        network="base",
        fiat_amount="100.00",
        fiat_currency="USD",
        token_amount="0.05",
        token="eth",
        fees=[Fee(type="exchange_fee", amount="1.00", currency="USD")],
    )
    assert valid_quote.quote_id == "test-quote-id"
    assert valid_quote.network == "base"
    assert valid_quote.fiat_amount == "100.00"
    assert valid_quote.fiat_currency == "USD"
    assert valid_quote.token_amount == "0.05"
    assert valid_quote.token == "eth"
    assert len(valid_quote.fees) == 1
    assert valid_quote.fees[0].amount == "1.00"
    assert valid_quote.fees[0].currency == "USD"
    assert valid_quote.fees[0].type == "exchange_fee"


def test_quote_initialization_on_ethereum():
    """Test quote initialization with valid parameters."""
    valid_quote = Quote(
        api_clients=MagicMock(spec=ApiClients),
        quote_id="test-quote-id",
        network="ethereum",
        fiat_amount="100.00",
        fiat_currency="USD",
        token_amount="0.05",
        token="eth",
        fees=[Fee(type="exchange_fee", amount="1.00", currency="USD")],
    )
    assert valid_quote.quote_id == "test-quote-id"
    assert valid_quote.network == "ethereum"
    assert valid_quote.fiat_amount == "100.00"
    assert valid_quote.fiat_currency == "USD"
    assert valid_quote.token_amount == "0.05"
    assert valid_quote.token == "eth"
    assert len(valid_quote.fees) == 1
    assert valid_quote.fees[0].amount == "1.00"
    assert valid_quote.fees[0].currency == "USD"
    assert valid_quote.fees[0].type == "exchange_fee"


def test_quote_invalid_network():
    """Test quote initialization with invalid network."""
    with pytest.raises(ValueError):
        Quote(
            api_clients=MagicMock(spec=ApiClients),
            quote_id="test-quote-id",
            network="invalid-network",  # Invalid network
            fiat_amount="100.00",
            fiat_currency="USD",
            token_amount="0.05",
            token="eth",
            fees=[Fee(type="exchange_fee", amount="1.00", currency="USD")],
        )


@pytest.mark.asyncio
async def test_quote_execute(payment_transfer_model_factory):
    """Test executing a quote."""
    mock_api_clients = MagicMock(spec=ApiClients)
    mock_api_clients.payments = AsyncMock()

    mock_transfer = payment_transfer_model_factory()
    mock_api_clients.payments.execute_payment_transfer_quote = AsyncMock(return_value=mock_transfer)

    quote = Quote(
        api_clients=mock_api_clients,
        quote_id="test-quote-id",
        network="base",
        fiat_amount="100.00",
        fiat_currency="USD",
        token_amount="0.05",
        token="eth",
        fees=[Fee(type="exchange_fee", amount="1.00", currency="USD")],
    )

    result = await quote.execute()

    assert isinstance(result, FundOperationResult)
    assert result.id == mock_transfer.id
    assert result.network == mock_transfer.target.actual_instance.network
    assert result.target_amount == mock_transfer.target_amount
    assert result.target_currency == mock_transfer.target_currency
    assert result.status == mock_transfer.status
    assert result.transaction_hash == mock_transfer.transaction_hash
    mock_api_clients.payments.execute_payment_transfer_quote.assert_called_once_with(
        "test-quote-id"
    )


@pytest.mark.asyncio
async def test_quote_execute_api_error():
    """Test handling API error during quote execution."""
    mock_api_clients = MagicMock(spec=ApiClients)
    mock_api_clients.payments = AsyncMock()

    mock_api_clients.payments.execute_payment_transfer_quote = AsyncMock(
        side_effect=Exception("API Error")
    )

    quote = Quote(
        api_clients=mock_api_clients,
        quote_id="test-quote-id",
        network="base",
        fiat_amount="100.00",
        fiat_currency="USD",
        token_amount="0.05",
        token="eth",
        fees=[Fee(type="exchange_fee", amount="1.00", currency="USD")],
    )

    with pytest.raises(Exception, match="API Error"):
        await quote.execute()

    mock_api_clients.payments.execute_payment_transfer_quote.assert_called_once_with(
        "test-quote-id"
    )
