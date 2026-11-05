from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from cdp.lend_client import LendClient, ListVaultsResult
from cdp.openapi_client.models.lend_network import LendNetwork
from cdp.openapi_client.models.list_vaults200_response import ListVaults200Response
from cdp.openapi_client.models.vault import Vault
from cdp.openapi_client.models.vault_status import VaultStatus


def _vault() -> Vault:
    return Vault(
        vault_id="vault_019f5f10-096a-7a23-86df-f479650d813f",
        address="0x15966F1582CAEFB56CDB4Fba1dC622E41F2Ad33D",
        catalog_vault_id="cv_019ee022-3586-7473-8354-b2c32c18221a",
        underlying_asset="usdc",
        performance_fee_bps=2000,
        fee_recipient_address="0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
        network=LendNetwork.BASE,
        status=VaultStatus.ACTIVE,
        created_at=datetime(2026, 9, 15, 15, 39, 37, tzinfo=timezone.utc),
    )


def _client() -> tuple[LendClient, MagicMock]:
    lend_api = MagicMock()
    lend_api.list_vaults = AsyncMock()
    lend_api.get_vault = AsyncMock()
    api_clients = MagicMock()
    api_clients.lend = lend_api
    return LendClient(api_clients=api_clients), lend_api


@pytest.mark.asyncio
async def test_list_vaults_with_defaults():
    """List vaults with no pagination options."""
    client, lend_api = _client()
    vault = _vault()
    lend_api.list_vaults.return_value = ListVaults200Response(vaults=[vault])

    result = await client.list_vaults()

    lend_api.list_vaults.assert_called_once_with(page_size=None, page_token=None)
    assert result == ListVaultsResult(vaults=[vault], next_page_token=None)


@pytest.mark.asyncio
async def test_list_vaults_with_pagination():
    """List vaults passes pagination options and returns the next page token."""
    client, lend_api = _client()
    vault = _vault()
    lend_api.list_vaults.return_value = ListVaults200Response(
        vaults=[vault], next_page_token="next-page"
    )

    result = await client.list_vaults(page_size=10, page_token="this-page")

    lend_api.list_vaults.assert_called_once_with(page_size=10, page_token="this-page")
    assert result.vaults == [vault]
    assert result.next_page_token == "next-page"


@pytest.mark.asyncio
async def test_list_vaults_tracks_and_reraises_errors():
    """List vaults tracks the error and re-raises it."""
    client, lend_api = _client()
    error = Exception("list failed")
    lend_api.list_vaults.side_effect = error

    with (
        patch("cdp.lend_client.track_error") as track_error,
        pytest.raises(Exception, match="list failed"),
    ):
        await client.list_vaults()

    track_error.assert_called_once_with(error, "list_vaults")


@pytest.mark.asyncio
async def test_get_vault():
    """Get a vault by ID."""
    client, lend_api = _client()
    vault = _vault()
    lend_api.get_vault.return_value = vault

    result = await client.get_vault(vault.vault_id)

    lend_api.get_vault.assert_called_once_with(vault_id=vault.vault_id)
    assert result == vault


@pytest.mark.asyncio
async def test_get_vault_tracks_and_reraises_errors():
    """Get a vault tracks the error and re-raises it."""
    client, lend_api = _client()
    error = Exception("not found")
    lend_api.get_vault.side_effect = error

    with (
        patch("cdp.lend_client.track_error") as track_error,
        pytest.raises(Exception, match="not found"),
    ):
        await client.get_vault("vault_019f5f10-096a-7a23-86df-f479650d813f")

    track_error.assert_called_once_with(error, "get_vault")
