import json
from unittest.mock import MagicMock, patch

import pytest

from cdp.analytics import ErrorEventData


@pytest.mark.asyncio
@patch("requests.post")
async def test_send_event(mock_post, mock_send_event):
    """Test sending an error event."""
    mock_response = MagicMock()
    mock_response.ok = True
    mock_response.status_code = 200
    mock_post.return_value = mock_response

    original_send_event = mock_send_event.original

    event_data = ErrorEventData(
        name="error", method="test", message="test", api_key_id="test-api-key-id"
    )

    await original_send_event(event_data)

    mock_post.assert_called_once()

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
