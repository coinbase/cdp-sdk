"""Tests for End User Client functionality."""

from unittest.mock import AsyncMock

import pytest

from cdp.api_clients import ApiClients
from cdp.end_user_client import EndUserClient
from cdp.openapi_client.cdp_api_client import CdpApiClient


def test_init():
    """Test the initialization of the EndUserClient."""
    client = EndUserClient(
        api_clients=ApiClients(
            CdpApiClient(
                api_key_id="test_api_key_id",
                api_key_secret="test_api_key_secret",
                wallet_secret="test_wallet_secret",
            )
        )
    )

    assert client.api_clients._cdp_client.api_key_id == "test_api_key_id"
    assert client.api_clients._cdp_client.api_key_secret == "test_api_key_secret"
    assert client.api_clients._cdp_client.wallet_secret == "test_wallet_secret"
    assert hasattr(client, "api_clients")


@pytest.mark.asyncio
async def test_validate_access_token_success(end_user_model_factory):
    """Test successful access token validation."""
    mock_access_token = "aaa.bbb.ccc"
    mock_end_user_id = "1234567890"
    mock_end_user_model = end_user_model_factory(user_id=mock_end_user_id)
    mock_api_clients = AsyncMock()
    mock_api_clients.end_user.validate_end_user_access_token = AsyncMock(
        return_value=mock_end_user_model
    )

    client = EndUserClient(api_clients=mock_api_clients)

    end_user = await client.validate_access_token(access_token=mock_access_token)
    assert end_user.user_id == mock_end_user_id


@pytest.mark.asyncio
async def test_validate_access_token_missing_access_token(end_user_model_factory):
    """Test missing access token."""
    mock_access_token = None
    mock_end_user_id = "1234567890"
    mock_end_user_model = end_user_model_factory(user_id=mock_end_user_id)
    mock_api_clients = AsyncMock()
    mock_api_clients.end_user.validate_end_user_access_token = AsyncMock(
        return_value=mock_end_user_model
    )

    client = EndUserClient(api_clients=mock_api_clients)

    with pytest.raises(ValueError, match="Input should be a valid string"):
        await client.validate_access_token(access_token=mock_access_token)
