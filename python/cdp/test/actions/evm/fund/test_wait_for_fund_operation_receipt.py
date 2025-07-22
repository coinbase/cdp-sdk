from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from cdp.actions.evm.fund.wait_for_fund_operation_receipt import wait_for_fund_operation_receipt
from cdp.openapi_client.exceptions import ApiException
from cdp.openapi_client.models.transfer import Transfer


@pytest.mark.asyncio
@patch("cdp.actions.evm.fund.wait_for_fund_operation_receipt.time", create=True)
@patch("cdp.cdp_client.ApiClients")
async def test_wait_for_fund_operation_receipt_success_immediate(mock_api_clients, mock_time):
    """Test successful completion of a fund operation that is already complete."""
    mock_time.time.return_value = 1000
    mock_time.sleep = MagicMock()

    mock_transfer = MagicMock(spec=Transfer)
    mock_transfer.id = "transfer_123"
    mock_transfer.status = "completed"

    mock_api_clients.payments.get_payment_transfer = AsyncMock(return_value=mock_transfer)

    result = await wait_for_fund_operation_receipt(
        api_clients=mock_api_clients,
        transfer_id=mock_transfer.id,
        timeout_seconds=300,
        interval_seconds=1,
    )

    assert result == mock_transfer
    mock_api_clients.payments.get_payment_transfer.assert_called_once_with(mock_transfer.id)
    mock_time.sleep.assert_not_called()


@pytest.mark.asyncio
@patch("cdp.actions.evm.fund.wait_for_fund_operation_receipt.time", create=True)
@patch("cdp.cdp_client.ApiClients")
async def test_wait_for_fund_operation_receipt_success_after_poll(mock_api_clients, mock_time):
    """Test successful completion of a fund operation after polling."""
    mock_time.time.side_effect = [1000, 1001, 1002]
    mock_time.sleep = MagicMock()

    mock_initial_transfer = MagicMock(spec=Transfer)
    mock_initial_transfer.id = "transfer_123"
    mock_initial_transfer.status = "pending"

    mock_updated_transfer = MagicMock(spec=Transfer)
    mock_updated_transfer.id = "transfer_123"
    mock_updated_transfer.status = "completed"

    mock_api_clients.payments.get_payment_transfer = AsyncMock(
        side_effect=[mock_initial_transfer, mock_updated_transfer]
    )

    result = await wait_for_fund_operation_receipt(
        api_clients=mock_api_clients,
        transfer_id=mock_initial_transfer.id,
        timeout_seconds=300,
        interval_seconds=1,
    )

    assert result == mock_updated_transfer
    assert mock_api_clients.payments.get_payment_transfer.call_count == 2
    mock_time.sleep.assert_called_once_with(1)


@pytest.mark.asyncio
@patch("cdp.actions.evm.fund.wait_for_fund_operation_receipt.time", create=True)
@patch("cdp.cdp_client.ApiClients")
async def test_wait_for_fund_operation_receipt_failed_status(mock_api_clients, mock_time):
    """Test handling of a fund operation that completes with 'failed' status."""
    mock_time.time.side_effect = [1000, 1001, 1002]
    mock_time.sleep = MagicMock()

    mock_initial_transfer = MagicMock(spec=Transfer)
    mock_initial_transfer.id = "transfer_123"
    mock_initial_transfer.status = "pending"

    mock_updated_transfer = MagicMock(spec=Transfer)
    mock_updated_transfer.id = "transfer_123"
    mock_updated_transfer.status = "failed"

    mock_api_clients.payments.get_payment_transfer = AsyncMock(
        side_effect=[mock_initial_transfer, mock_updated_transfer]
    )

    result = await wait_for_fund_operation_receipt(
        api_clients=mock_api_clients,
        transfer_id=mock_initial_transfer.id,
        timeout_seconds=300,
        interval_seconds=1,
    )

    assert result == mock_updated_transfer
    assert mock_api_clients.payments.get_payment_transfer.call_count == 2
    mock_time.sleep.assert_called_once_with(1)


@pytest.mark.asyncio
@patch("cdp.actions.evm.fund.wait_for_fund_operation_receipt.time", create=True)
@patch("cdp.cdp_client.ApiClients")
async def test_wait_for_fund_operation_receipt_timeout(mock_api_clients, mock_time):
    """Test timeout for a fund operation that never completes."""
    start_time = 1000

    # Create a sequence of times that will eventually exceed the timeout
    time_values = [start_time]
    current_time = start_time
    for _ in range(150):
        current_time += 0.1
        time_values.append(current_time)

    time_values[-5:] = [
        start_time + 300.1,
        start_time + 300.2,
        start_time + 300.3,
        start_time + 300.4,
        start_time + 300.5,
    ]

    mock_time.time.side_effect = time_values
    mock_time.sleep = MagicMock()

    mock_pending_transfer = MagicMock(spec=Transfer)
    mock_pending_transfer.id = "transfer_123"
    mock_pending_transfer.status = "pending"

    mock_api_clients.payments.get_payment_transfer = AsyncMock(return_value=mock_pending_transfer)

    with pytest.raises(TimeoutError, match="Transfer timed out"):
        await wait_for_fund_operation_receipt(
            api_clients=mock_api_clients,
            transfer_id=mock_pending_transfer.id,
            timeout_seconds=300,
            interval_seconds=1,
        )

    assert mock_api_clients.payments.get_payment_transfer.call_count > 1
    assert mock_time.sleep.call_count > 1


@pytest.mark.asyncio
@patch("cdp.actions.evm.fund.wait_for_fund_operation_receipt.time", create=True)
@patch("cdp.cdp_client.ApiClients")
async def test_wait_for_fund_operation_receipt_api_error(mock_api_clients, mock_time):
    """Test handling of API errors during polling."""
    mock_time.time.side_effect = [1000, 1001]
    mock_time.sleep = MagicMock()

    mock_initial_transfer = MagicMock(spec=Transfer)
    mock_initial_transfer.id = "transfer_123"
    mock_initial_transfer.status = "pending"

    mock_api_clients.payments.get_payment_transfer = AsyncMock(
        side_effect=ApiException(status=500, reason="Internal Server Error")
    )

    with pytest.raises(ApiException) as exc_info:
        await wait_for_fund_operation_receipt(
            api_clients=mock_api_clients,
            transfer_id=mock_initial_transfer.id,
            timeout_seconds=300,
            interval_seconds=1,
        )

    assert exc_info.value.status == 500
    assert exc_info.value.reason == "Internal Server Error"

    mock_api_clients.payments.get_payment_transfer.assert_called_once_with(mock_initial_transfer.id)


@pytest.mark.asyncio
@patch("cdp.actions.evm.fund.wait_for_fund_operation_receipt.time", create=True)
@patch("cdp.cdp_client.ApiClients")
async def test_wait_for_fund_operation_receipt_custom_timeout_and_interval(
    mock_api_clients, mock_time
):
    """Test using custom timeout and interval values."""
    start_time = 1000
    mock_time.time.side_effect = [
        start_time,
        start_time + 1,
        start_time + 2,
        start_time + 3,
        start_time + 11,
    ]
    mock_time.sleep = MagicMock()

    mock_pending_transfer = MagicMock(spec=Transfer)
    mock_pending_transfer.id = "transfer_123"
    mock_pending_transfer.status = "pending"

    mock_api_clients.payments.get_payment_transfer = AsyncMock(return_value=mock_pending_transfer)

    with pytest.raises(TimeoutError, match="Transfer timed out"):
        await wait_for_fund_operation_receipt(
            api_clients=mock_api_clients,
            transfer_id=mock_pending_transfer.id,
            timeout_seconds=10,
            interval_seconds=1.0,
        )

    mock_time.sleep.assert_called_with(1.0)


@pytest.mark.asyncio
@patch("cdp.actions.evm.fund.wait_for_fund_operation_receipt.time", create=True)
@patch("cdp.cdp_client.ApiClients")
async def test_wait_for_fund_operation_receipt_multiple_status_changes(mock_api_clients, mock_time):
    """Test handling of a fund operation that goes through multiple status changes."""
    mock_time.time.side_effect = [1000, 1001, 1002, 1003]
    mock_time.sleep = MagicMock()

    mock_initial_transfer = MagicMock(spec=Transfer)
    mock_initial_transfer.id = "transfer_123"
    mock_initial_transfer.status = "pending"

    mock_processing_transfer = MagicMock(spec=Transfer)
    mock_processing_transfer.id = "transfer_123"
    mock_processing_transfer.status = "processing"

    mock_complete_transfer = MagicMock(spec=Transfer)
    mock_complete_transfer.id = "transfer_123"
    mock_complete_transfer.status = "completed"

    mock_api_clients.payments.get_payment_transfer = AsyncMock(
        side_effect=[mock_initial_transfer, mock_processing_transfer, mock_complete_transfer]
    )

    result = await wait_for_fund_operation_receipt(
        api_clients=mock_api_clients,
        transfer_id=mock_initial_transfer.id,
        timeout_seconds=300,
        interval_seconds=1,
    )

    assert result == mock_complete_transfer
    assert mock_api_clients.payments.get_payment_transfer.call_count == 3
    assert mock_time.sleep.call_count == 2


@pytest.mark.asyncio
@patch("cdp.actions.evm.fund.wait_for_fund_operation_receipt.time", create=True)
@patch("cdp.cdp_client.ApiClients")
async def test_wait_for_fund_operation_receipt_invalid_transfer_id(mock_api_clients, mock_time):
    """Test handling of an API error when transfer_id is invalid."""
    mock_time.time.return_value = 1000
    mock_time.sleep = MagicMock()

    mock_transfer = MagicMock(spec=Transfer)
    mock_transfer.id = "invalid-transfer-id"
    mock_transfer.status = "pending"

    mock_api_clients.payments.get_payment_transfer = AsyncMock(
        side_effect=ApiException(status=404, reason="Transfer not found")
    )

    with pytest.raises(ApiException) as exc_info:
        await wait_for_fund_operation_receipt(
            api_clients=mock_api_clients,
            transfer_id=mock_transfer.id,
            timeout_seconds=300,
            interval_seconds=1,
        )

    assert exc_info.value.status == 404
    assert exc_info.value.reason == "Transfer not found"
