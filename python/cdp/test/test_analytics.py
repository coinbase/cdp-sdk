import json
import os
from unittest.mock import AsyncMock, patch

import pytest

from cdp.analytics import Analytics, ErrorEventData, should_track_error
from cdp.errors import UserInputValidationError
from cdp.openapi_client.errors import ApiError, HttpErrorType, NetworkError


@pytest.mark.asyncio
@patch("aiohttp.ClientSession")
async def test_send_event(mock_client_session_class, mock_send_event):
    """Test sending an error event."""
    # Temporarily disable the environment variable
    original_env = os.environ.get("DISABLE_CDP_ERROR_REPORTING")
    os.environ["DISABLE_CDP_ERROR_REPORTING"] = "false"

    try:
        # Mock the aiohttp session and response
        mock_response = AsyncMock()
        mock_response.status = 200
        mock_response.text = AsyncMock(return_value="OK")

        mock_post = AsyncMock(return_value=mock_response)
        mock_session = AsyncMock()
        mock_session.post = mock_post
        mock_session.__aenter__ = AsyncMock(return_value=mock_session)
        mock_session.__aexit__ = AsyncMock()

        mock_client_session_class.return_value = mock_session

        original_send_event = mock_send_event.original

        Analytics["identifier"] = "test-api-key-id"
        event_data = ErrorEventData(name="error", method="test", message="test")

        await original_send_event(event_data)

        # Verify the session was created
        mock_client_session_class.assert_called_once()

        # Verify post was called
        mock_post.assert_called_once()

        # Get the call arguments
        args, kwargs = mock_post.call_args
        assert args[0] == "https://cca-lite.coinbase.com/amp"

        assert kwargs["headers"] == {"Content-Type": "application/json"}

        data = kwargs["json"]
        assert "e" in data

        event_data = json.loads(data["e"])
        assert len(event_data) > 0
        assert event_data[0]["event_type"] == "error"
        assert event_data[0]["platform"] == "server"
        assert event_data[0]["user_id"] == "test-api-key-id"
        assert event_data[0]["timestamp"] is not None

        event_props = event_data[0]["event_properties"]
        assert event_props["cdp_sdk_language"] == "python"
        assert event_props["name"] == "error"
        assert event_props["method"] == "test"
        assert event_props["message"] == "test"
    finally:
        # Restore the original environment variable
        if original_env is not None:
            os.environ["DISABLE_CDP_ERROR_REPORTING"] = original_env
        else:
            del os.environ["DISABLE_CDP_ERROR_REPORTING"]


def test_should_track_error_user_input_validation():
    """Test that UserInputValidationError is not tracked."""
    error = UserInputValidationError("Invalid input")
    assert not should_track_error(error)


def test_should_track_error_api_error_expected():
    """Test that expected API errors are not tracked."""
    error = ApiError(
        http_code=400,
        error_type="invalid_request",  # Using string literal as per API specification
        error_message="Invalid request",
    )
    assert not should_track_error(error)


def test_should_track_error_api_error_unexpected():
    """Test that unexpected API errors are tracked."""
    error = ApiError(
        http_code=500, error_type=HttpErrorType.UNEXPECTED_ERROR, error_message="Unexpected error"
    )
    assert should_track_error(error)


def test_should_track_error_network_error():
    """Test that NetworkError instances are tracked."""
    error = NetworkError(
        error_type=HttpErrorType.NETWORK_IP_BLOCKED,
        error_message="IP blocked",
        network_details={"code": "IP_BLOCKED", "retryable": False},
    )
    assert should_track_error(error)


def test_should_track_error_generic_exception():
    """Test that generic exceptions are tracked."""
    error = ValueError("Some value error")
    assert should_track_error(error)
