from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from cdp.actions.evm.wait_for_user_operation import wait_for_user_operation
from cdp.evm_smart_account import EvmSmartAccount
from cdp.openapi_client.exceptions import ApiException
from cdp.openapi_client.models.evm_user_operation import EvmUserOperation


@pytest.mark.asyncio
@patch("cdp.actions.evm.wait_for_user_operation.time")
@patch("cdp.cdp_client.ApiClients")
async def test_wait_for_user_operation_success_immediate(mock_api_clients, mock_time):
    """Test successful completion of a user operation that is already complete."""
    mock_time.time.return_value = 1000
    mock_time.sleep = MagicMock()

    mock_smart_account = MagicMock(spec=EvmSmartAccount)
    mock_smart_account.address = "0x1234567890123456789012345678901234567890"

    mock_user_op = MagicMock(spec=EvmUserOperation)
    mock_user_op.user_op_hash = "0xuserhash123"
    mock_user_op.status = "complete"

    mock_api_clients.evm_smart_accounts.get_user_operation = AsyncMock(return_value=mock_user_op)

    result = await wait_for_user_operation(
        api_clients=mock_api_clients,
        smart_account_address=mock_smart_account.address,
        user_op_hash=mock_user_op.user_op_hash,
        timeout_seconds=20,
        interval_seconds=0.2,
    )

    assert result == mock_user_op
    mock_api_clients.evm_smart_accounts.get_user_operation.assert_called_once_with(
        mock_smart_account.address, mock_user_op.user_op_hash
    )
    mock_time.sleep.assert_not_called()


@pytest.mark.asyncio
@patch("cdp.actions.evm.wait_for_user_operation.time")
@patch("cdp.cdp_client.ApiClients")
async def test_wait_for_user_operation_success_after_poll(mock_api_clients, mock_time):
    """Test successful completion of a user operation after polling."""
    mock_time.time.side_effect = [1000, 1000.5, 1001]
    mock_time.sleep = MagicMock()

    mock_smart_account = MagicMock(spec=EvmSmartAccount)
    mock_smart_account.address = "0x1234567890123456789012345678901234567890"

    mock_initial_op = MagicMock(spec=EvmUserOperation)
    mock_initial_op.user_op_hash = "0xuserhash123"
    mock_initial_op.status = "pending"

    mock_updated_op = MagicMock(spec=EvmUserOperation)
    mock_updated_op.user_op_hash = "0xuserhash123"
    mock_updated_op.status = "complete"

    mock_api_clients.evm_smart_accounts.get_user_operation = AsyncMock(
        side_effect=[mock_initial_op, mock_updated_op]
    )

    result = await wait_for_user_operation(
        api_clients=mock_api_clients,
        smart_account_address=mock_smart_account.address,
        user_op_hash=mock_initial_op.user_op_hash,
        timeout_seconds=20,
        interval_seconds=0.2,
    )

    assert result == mock_updated_op
    assert mock_api_clients.evm_smart_accounts.get_user_operation.call_count == 2
    mock_time.sleep.assert_called_once_with(0.2)


@pytest.mark.asyncio
@patch("cdp.actions.evm.wait_for_user_operation.time")
@patch("cdp.cdp_client.ApiClients")
async def test_wait_for_user_operation_failed_status(mock_api_clients, mock_time):
    """Test handling of a user operation that completes with 'failed' status."""
    mock_time.time.side_effect = [1000, 1000.5, 1001]
    mock_time.sleep = MagicMock()

    mock_smart_account = MagicMock(spec=EvmSmartAccount)
    mock_smart_account.address = "0x1234567890123456789012345678901234567890"

    mock_initial_op = MagicMock(spec=EvmUserOperation)
    mock_initial_op.user_op_hash = "0xuserhash123"
    mock_initial_op.status = "pending"

    mock_updated_op = MagicMock(spec=EvmUserOperation)
    mock_updated_op.user_op_hash = "0xuserhash123"
    mock_updated_op.status = "failed"

    mock_api_clients.evm_smart_accounts.get_user_operation = AsyncMock(
        side_effect=[mock_initial_op, mock_updated_op]
    )

    result = await wait_for_user_operation(
        api_clients=mock_api_clients,
        smart_account_address=mock_smart_account.address,
        user_op_hash=mock_initial_op.user_op_hash,
        timeout_seconds=20,
        interval_seconds=0.2,
    )

    assert result == mock_updated_op
    assert mock_api_clients.evm_smart_accounts.get_user_operation.call_count == 2
    mock_time.sleep.assert_called_once_with(0.2)


@pytest.mark.asyncio
@patch("cdp.actions.evm.wait_for_user_operation.time")
@patch("cdp.cdp_client.ApiClients")
async def test_wait_for_user_operation_timeout(mock_api_clients, mock_time):
    """Test timeout for a user operation that never completes."""
    start_time = 1000

    # Create a sequence of times that will eventually exceed the timeout
    # First value is the initial time.time() call to set start_time
    # Then provide time values that eventually exceed start_time + timeout_seconds
    time_values = [start_time]

    # Add enough time values to handle all the API calls
    # Each iteration: check time, make API call, sleep
    current_time = start_time
    for _ in range(150):
        current_time += 0.1
        time_values.append(current_time)

    time_values[-5:] = [
        start_time + 20.1,
        start_time + 20.2,
        start_time + 20.3,
        start_time + 20.4,
        start_time + 20.5,
    ]

    mock_time.time.side_effect = time_values
    mock_time.sleep = MagicMock()

    mock_smart_account = MagicMock(spec=EvmSmartAccount)
    mock_smart_account.address = "0x1234567890123456789012345678901234567890"

    mock_pending_op = MagicMock(spec=EvmUserOperation)
    mock_pending_op.user_op_hash = "0xuserhash123"
    mock_pending_op.status = "pending"

    mock_api_clients.evm_smart_accounts.get_user_operation = AsyncMock(return_value=mock_pending_op)

    with pytest.raises(TimeoutError, match="User Operation timed out"):
        await wait_for_user_operation(
            api_clients=mock_api_clients,
            smart_account_address=mock_smart_account.address,
            user_op_hash=mock_pending_op.user_op_hash,
            timeout_seconds=20,
            interval_seconds=0.2,
        )

    assert mock_api_clients.evm_smart_accounts.get_user_operation.call_count > 1
    assert mock_time.sleep.call_count > 1


@pytest.mark.asyncio
@patch("cdp.actions.evm.wait_for_user_operation.time")
@patch("cdp.cdp_client.ApiClients")
async def test_wait_for_user_operation_api_error(mock_api_clients, mock_time):
    """Test handling of API errors during polling."""
    mock_time.time.side_effect = [1000, 1000.5]
    mock_time.sleep = MagicMock()

    mock_smart_account = MagicMock(spec=EvmSmartAccount)
    mock_smart_account.address = "0x1234567890123456789012345678901234567890"

    mock_initial_op = MagicMock(spec=EvmUserOperation)
    mock_initial_op.user_op_hash = "0xuserhash123"
    mock_initial_op.status = "pending"

    mock_api_clients.evm_smart_accounts.get_user_operation = AsyncMock(
        side_effect=ApiException(status=500, reason="Internal Server Error")
    )

    with pytest.raises(ApiException) as exc_info:
        await wait_for_user_operation(
            api_clients=mock_api_clients,
            smart_account_address=mock_smart_account.address,
            user_op_hash=mock_initial_op.user_op_hash,
            timeout_seconds=20,
            interval_seconds=0.2,
        )

    assert exc_info.value.status == 500
    assert exc_info.value.reason == "Internal Server Error"

    mock_api_clients.evm_smart_accounts.get_user_operation.assert_called_once_with(
        mock_smart_account.address, mock_initial_op.user_op_hash
    )


@pytest.mark.asyncio
@patch("cdp.actions.evm.wait_for_user_operation.time")
@patch("cdp.cdp_client.ApiClients")
async def test_wait_for_user_operation_custom_timeout_and_interval(mock_api_clients, mock_time):
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

    mock_smart_account = MagicMock(spec=EvmSmartAccount)
    mock_smart_account.address = "0x1234567890123456789012345678901234567890"

    mock_pending_op = MagicMock(spec=EvmUserOperation)
    mock_pending_op.user_op_hash = "0xuserhash123"
    mock_pending_op.status = "pending"

    mock_api_clients.evm_smart_accounts.get_user_operation = AsyncMock(return_value=mock_pending_op)

    with pytest.raises(TimeoutError, match="User Operation timed out"):
        await wait_for_user_operation(
            api_clients=mock_api_clients,
            smart_account_address=mock_smart_account.address,
            user_op_hash=mock_pending_op.user_op_hash,
            timeout_seconds=10,
            interval_seconds=1.0,
        )

    mock_time.sleep.assert_called_with(1.0)


@pytest.mark.asyncio
@patch("cdp.actions.evm.wait_for_user_operation.time")
@patch("cdp.cdp_client.ApiClients")
async def test_wait_for_user_operation_multiple_status_changes(mock_api_clients, mock_time):
    """Test handling of a user operation that goes through multiple status changes."""
    mock_time.time.side_effect = [1000, 1000.5, 1001, 1001.5]
    mock_time.sleep = MagicMock()

    mock_smart_account = MagicMock(spec=EvmSmartAccount)
    mock_smart_account.address = "0x1234567890123456789012345678901234567890"

    mock_initial_op = MagicMock(spec=EvmUserOperation)
    mock_initial_op.user_op_hash = "0xuserhash123"
    mock_initial_op.status = "pending"

    mock_processing_op = MagicMock(spec=EvmUserOperation)
    mock_processing_op.user_op_hash = "0xuserhash123"
    mock_processing_op.status = "processing"

    mock_complete_op = MagicMock(spec=EvmUserOperation)
    mock_complete_op.user_op_hash = "0xuserhash123"
    mock_complete_op.status = "complete"

    mock_api_clients.evm_smart_accounts.get_user_operation = AsyncMock(
        side_effect=[mock_initial_op, mock_processing_op, mock_complete_op]
    )

    result = await wait_for_user_operation(
        api_clients=mock_api_clients,
        smart_account_address=mock_smart_account.address,
        user_op_hash=mock_initial_op.user_op_hash,
        timeout_seconds=20,
        interval_seconds=0.2,
    )

    assert result == mock_complete_op
    assert mock_api_clients.evm_smart_accounts.get_user_operation.call_count == 3
    assert mock_time.sleep.call_count == 2


@pytest.mark.asyncio
@patch("cdp.actions.evm.wait_for_user_operation.time")
@patch("cdp.cdp_client.ApiClients")
async def test_wait_for_user_operation_invalid_user_op_hash(mock_api_clients, mock_time):
    """Test handling of an API error when user_op_hash is invalid."""
    mock_time.time.return_value = 1000
    mock_time.sleep = MagicMock()

    mock_smart_account = MagicMock(spec=EvmSmartAccount)
    mock_smart_account.address = "0x1234567890123456789012345678901234567890"

    mock_op = MagicMock(spec=EvmUserOperation)
    mock_op.user_op_hash = "invalid-hash"
    mock_op.status = "pending"

    mock_api_clients.evm_smart_accounts.get_user_operation = AsyncMock(
        side_effect=ApiException(status=404, reason="User operation not found")
    )

    with pytest.raises(ApiException) as exc_info:
        await wait_for_user_operation(
            api_clients=mock_api_clients,
            smart_account_address=mock_smart_account.address,
            user_op_hash=mock_op.user_op_hash,
            timeout_seconds=20,
            interval_seconds=0.2,
        )

    assert exc_info.value.status == 404
    assert exc_info.value.reason == "User operation not found"
