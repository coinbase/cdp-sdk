from unittest.mock import AsyncMock

import pytest

from cdp.actions.solana.sign_transaction import sign_transaction
from cdp.openapi_client.api.solana_accounts_api import SolanaAccountsApi
from cdp.openapi_client.models.sign_solana_transaction200_response import (
    SignSolanaTransaction200Response as SignSolanaTransactionResponse,
)
from cdp.openapi_client.models.sign_solana_transaction_request import (
    SignSolanaTransactionRequest,
)


@pytest.mark.asyncio
async def test_sign_transaction_success():
    """Test successful transaction signing."""
    # Setup mock Solana accounts API
    mock_solana_accounts_api = AsyncMock(spec=SolanaAccountsApi)

    # Setup test data
    test_address = "14grJpemFaf88c8tiVb77W7TYg2W3ir6pfkKz3YjhhZ5"
    test_transaction = "test_transaction_data"
    test_idempotency_key = "test-idempotency-key"
    test_signature = "test_signature"

    # Setup mock response
    mock_response = SignSolanaTransactionResponse(signed_transaction=test_signature)
    mock_solana_accounts_api.sign_solana_transaction = AsyncMock(return_value=mock_response)

    # Call the function
    result = await sign_transaction(
        solana_accounts_api=mock_solana_accounts_api,
        address=test_address,
        transaction=test_transaction,
        idempotency_key=test_idempotency_key,
    )

    # Verify the API was called correctly
    mock_solana_accounts_api.sign_solana_transaction.assert_called_once_with(
        sign_solana_transaction_request=SignSolanaTransactionRequest(
            transaction=test_transaction,
        ),
        address=test_address,
        x_idempotency_key=test_idempotency_key,
    )

    # Verify the response
    assert result == mock_response
    assert result.signed_transaction == test_signature


@pytest.mark.asyncio
async def test_sign_transaction_error():
    """Test transaction signing error handling."""
    # Setup mock Solana accounts API
    mock_solana_accounts_api = AsyncMock(spec=SolanaAccountsApi)

    # Setup test data
    test_address = "14grJpemFaf88c8tiVb77W7TYg2W3ir6pfkKz3YjhhZ5"
    test_transaction = "test_transaction_data"
    test_idempotency_key = "test-idempotency-key"

    # Setup mock to raise an error
    mock_solana_accounts_api.sign_solana_transaction = AsyncMock(side_effect=Exception("API Error"))

    # Verify the error is propagated
    with pytest.raises(Exception) as exc_info:
        await sign_transaction(
            solana_accounts_api=mock_solana_accounts_api,
            address=test_address,
            transaction=test_transaction,
            idempotency_key=test_idempotency_key,
        )

    assert str(exc_info.value) == "API Error"

    # Verify the API was called correctly
    mock_solana_accounts_api.sign_solana_transaction.assert_called_once_with(
        sign_solana_transaction_request=SignSolanaTransactionRequest(
            transaction=test_transaction,
        ),
        address=test_address,
        x_idempotency_key=test_idempotency_key,
    )
