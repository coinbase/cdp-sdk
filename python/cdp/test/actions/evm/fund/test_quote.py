from unittest.mock import AsyncMock, MagicMock

import pytest

from cdp.actions.evm.fund.quote import Quote
from cdp.actions.evm.fund.types import FundOperationResult
from cdp.api_clients import ApiClients
from cdp.openapi_client.models.fee import Fee
from cdp.openapi_client.models.transfer import Transfer


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
async def test_quote_execute():
    """Test executing a quote."""
    mock_api_clients = MagicMock(spec=ApiClients)
    mock_api_clients.payments = AsyncMock()

    mock_transfer = MagicMock(spec=Transfer)
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
    assert result.transfer == mock_transfer
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
