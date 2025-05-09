from unittest.mock import AsyncMock

import pytest

from cdp.actions.solana.request_faucet import request_faucet
from cdp.openapi_client.api.faucets_api import FaucetsApi
from cdp.openapi_client.models.request_solana_faucet200_response import (
    RequestSolanaFaucet200Response as RequestSolanaFaucetResponse,
)
from cdp.openapi_client.models.request_solana_faucet_request import RequestSolanaFaucetRequest


@pytest.mark.asyncio
async def test_request_faucet_success():
    """Test successful faucet request."""
    # Setup mock faucets API
    mock_faucets_api = AsyncMock(spec=FaucetsApi)

    # Setup test data
    test_address = "14grJpemFaf88c8tiVb77W7TYg2W3ir6pfkKz3YjhhZ5"
    test_token = "sol"
    test_tx_signature = "test_tx_signature"

    # Setup mock response
    mock_response = RequestSolanaFaucetResponse(transaction_signature=test_tx_signature)
    mock_faucets_api.request_solana_faucet = AsyncMock(return_value=mock_response)

    # Call the function
    result = await request_faucet(
        faucets=mock_faucets_api,
        address=test_address,
        token=test_token,
    )

    # Verify the API was called correctly
    mock_faucets_api.request_solana_faucet.assert_called_once_with(
        request_solana_faucet_request=RequestSolanaFaucetRequest(
            address=test_address,
            token=test_token,
        )
    )

    # Verify the response
    assert result == mock_response
    assert result.transaction_signature == test_tx_signature


@pytest.mark.asyncio
async def test_request_faucet_error():
    """Test faucet request error handling."""
    # Setup mock faucets API
    mock_faucets_api = AsyncMock(spec=FaucetsApi)

    # Setup test data
    test_address = "14grJpemFaf88c8tiVb77W7TYg2W3ir6pfkKz3YjhhZ5"
    test_token = "sol"

    # Setup mock to raise an error
    mock_faucets_api.request_solana_faucet = AsyncMock(side_effect=Exception("API Error"))

    # Verify the error is propagated
    with pytest.raises(Exception) as exc_info:
        await request_faucet(
            faucets=mock_faucets_api,
            address=test_address,
            token=test_token,
        )

    assert str(exc_info.value) == "API Error"

    # Verify the API was called correctly
    mock_faucets_api.request_solana_faucet.assert_called_once_with(
        request_solana_faucet_request=RequestSolanaFaucetRequest(
            address=test_address,
            token=test_token,
        )
    )
