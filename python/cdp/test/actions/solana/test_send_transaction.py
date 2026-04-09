from unittest.mock import AsyncMock

import pytest

from cdp.actions.solana.send_transaction import send_transaction
from cdp.openapi_client.api.solana_accounts_api import SolanaAccountsApi
from cdp.openapi_client.models.send_solana_transaction_request import (
    SendSolanaTransactionRequest,
)


@pytest.mark.asyncio
async def test_send_transaction_success():
    """Test successful transaction sending."""
    mock_solana_accounts_api = AsyncMock(spec=SolanaAccountsApi)

    test_transaction = "test_transaction_data"
    test_network = "solana-devnet"
    test_idempotency_key = "test-idempotency-key"
    test_signature = "test_signature"

    mock_solana_accounts_api.send_solana_transaction = AsyncMock(return_value=test_signature)

    result = await send_transaction(
        solana_accounts_api=mock_solana_accounts_api,
        transaction=test_transaction,
        network=test_network,
        idempotency_key=test_idempotency_key,
    )

    mock_solana_accounts_api.send_solana_transaction.assert_called_once_with(
        send_solana_transaction_request=SendSolanaTransactionRequest(
            network=test_network,
            transaction=test_transaction,
            use_cdp_sponsor=None,
        ),
        x_idempotency_key=test_idempotency_key,
    )

    assert result == test_signature


@pytest.mark.asyncio
async def test_send_transaction_with_fee_sponsor():
    """Test sending a transaction with CDP fee sponsorship enabled."""
    mock_solana_accounts_api = AsyncMock(spec=SolanaAccountsApi)

    test_transaction = "test_transaction_data"
    test_network = "solana-devnet"
    test_signature = "sponsored_signature"

    mock_solana_accounts_api.send_solana_transaction = AsyncMock(return_value=test_signature)

    result = await send_transaction(
        solana_accounts_api=mock_solana_accounts_api,
        transaction=test_transaction,
        network=test_network,
        use_cdp_sponsor=True,
    )

    mock_solana_accounts_api.send_solana_transaction.assert_called_once_with(
        send_solana_transaction_request=SendSolanaTransactionRequest(
            network=test_network,
            transaction=test_transaction,
            use_cdp_sponsor=True,
        ),
        x_idempotency_key=None,
    )

    assert result == test_signature


@pytest.mark.asyncio
async def test_send_transaction_error():
    """Test transaction sending error handling."""
    mock_solana_accounts_api = AsyncMock(spec=SolanaAccountsApi)

    mock_solana_accounts_api.send_solana_transaction = AsyncMock(side_effect=Exception("API Error"))

    with pytest.raises(Exception) as exc_info:
        await send_transaction(
            solana_accounts_api=mock_solana_accounts_api,
            transaction="test_transaction_data",
            network="solana-devnet",
        )

    assert str(exc_info.value) == "API Error"
