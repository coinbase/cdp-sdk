from unittest.mock import patch

import pytest

from cdp import CdpClient


def test_init_with_default_params():
    """Test initializing the client with default parameters."""
    api_key_id = "test_api_key_id"
    api_key_secret = "test_api_key_secret"
    wallet_secret = "test_wallet_secret"

    client = CdpClient(api_key_id, api_key_secret, wallet_secret)

    assert client.api_key_id == api_key_id
    assert client.api_key_secret == api_key_secret
    assert client.wallet_secret == wallet_secret
    assert client.debugging is False
    assert client._evm is not None
    assert client._solana is not None


def test_init_with_custom_params():
    """Test initializing the client with custom parameters."""
    api_key_id = "test_api_key_id"
    api_key_secret = "test_api_key_secret"
    wallet_secret = "test_wallet_secret"
    debugging = True
    base_path = "https://custom-api.example.com"
    max_network_retries = 5
    source = "custom-source"
    source_version = "1.2.3"

    client = CdpClient(
        api_key_id,
        api_key_secret,
        wallet_secret,
        debugging,
        base_path,
        max_network_retries,
        source,
        source_version,
    )

    assert client.api_key_id == api_key_id
    assert client.api_key_secret == api_key_secret
    assert client.wallet_secret == wallet_secret
    assert client.debugging is True
    assert client._evm is not None
    assert client._solana is not None


def test_evm_property():
    """Test the evm property."""
    client = CdpClient("api_key_id", "api_key_secret", "wallet_secret")
    evm_client = client.evm
    assert evm_client == client._evm


def test_solana_property():
    """Test the solana property."""
    client = CdpClient("api_key_id", "api_key_secret", "wallet_secret")
    solana_client = client.solana
    assert solana_client == client._solana


@pytest.mark.asyncio
@patch("cdp.api_clients.ApiClients.close")
async def test_close(mock_close):
    """Test closing the client."""
    mock_close.return_value = None

    client = CdpClient("api_key_id", "api_key_secret", "wallet_secret")
    result = await client.close()

    mock_close.assert_called_once()
    assert result is None
