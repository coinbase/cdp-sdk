from unittest.mock import AsyncMock

import pytest

from cdp.actions.solana.sign_message import sign_message
from cdp.openapi_client.api.solana_accounts_api import SolanaAccountsApi
from cdp.openapi_client.models.sign_solana_message200_response import (
    SignSolanaMessage200Response as SignSolanaMessageResponse,
)
from cdp.openapi_client.models.sign_solana_message_request import SignSolanaMessageRequest


@pytest.mark.asyncio
async def test_sign_message_success():
    """Test successful message signing."""
    # Setup mock Solana accounts API
    mock_solana_accounts_api = AsyncMock(spec=SolanaAccountsApi)

    # Setup test data
    test_address = "14grJpemFaf88c8tiVb77W7TYg2W3ir6pfkKz3YjhhZ5"
    test_message = "Hello, Solana!"
    test_idempotency_key = "test-idempotency-key"
    test_signature = "test_signature"

    # Setup mock response
    mock_response = SignSolanaMessageResponse(signature=test_signature)
    mock_solana_accounts_api.sign_solana_message = AsyncMock(return_value=mock_response)

    # Call the function
    result = await sign_message(
        solana_accounts_api=mock_solana_accounts_api,
        address=test_address,
        message=test_message,
        idempotency_key=test_idempotency_key,
    )

    # Verify the API was called correctly
    mock_solana_accounts_api.sign_solana_message.assert_called_once_with(
        sign_solana_message_request=SignSolanaMessageRequest(
            message=test_message,
        ),
        address=test_address,
        x_idempotency_key=test_idempotency_key,
    )

    # Verify the response
    assert result == mock_response
    assert result.signature == test_signature


@pytest.mark.asyncio
async def test_sign_message_error():
    """Test message signing error handling."""
    # Setup mock Solana accounts API
    mock_solana_accounts_api = AsyncMock(spec=SolanaAccountsApi)

    # Setup test data
    test_address = "14grJpemFaf88c8tiVb77W7TYg2W3ir6pfkKz3YjhhZ5"
    test_message = "Hello, Solana!"
    test_idempotency_key = "test-idempotency-key"

    # Setup mock to raise an error
    mock_solana_accounts_api.sign_solana_message = AsyncMock(side_effect=Exception("API Error"))

    # Verify the error is propagated
    with pytest.raises(Exception) as exc_info:
        await sign_message(
            solana_accounts_api=mock_solana_accounts_api,
            address=test_address,
            message=test_message,
            idempotency_key=test_idempotency_key,
        )

    assert str(exc_info.value) == "API Error"

    # Verify the API was called correctly
    mock_solana_accounts_api.sign_solana_message.assert_called_once_with(
        sign_solana_message_request=SignSolanaMessageRequest(
            message=test_message,
        ),
        address=test_address,
        x_idempotency_key=test_idempotency_key,
    )
