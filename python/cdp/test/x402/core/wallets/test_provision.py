"""Unit tests for wallets/provision.py."""

from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from cdp.errors import SmartAccountAlreadyExistsError
from cdp.x402.core.wallets.config import ResolvedWalletConfig
from cdp.x402.core.wallets.provision import provision_cdp_accounts


def _resolved_wallet_config(wallet_type: str = "cdp-eoa") -> ResolvedWalletConfig:
    return ResolvedWalletConfig(
        type=wallet_type,
        account_name="receiver-wallet",
        owner_account_name="owner-wallet" if wallet_type == "cdp-smart" else None,
    )


def _resolved_credentials() -> SimpleNamespace:
    return SimpleNamespace(
        api_key_id="api-key-id",
        api_key_secret="api-key-secret",
        wallet_secret="wallet-secret",
    )


def _cdp_client_mock() -> MagicMock:
    cdp_client = MagicMock()
    cdp_client.close = AsyncMock()
    return cdp_client


class TestProvisionCDPAccounts:
    async def test_closes_client_when_provisioning_fails(self) -> None:
        cdp_client = _cdp_client_mock()
        cdp_client.solana.get_or_create_account = AsyncMock(
            side_effect=RuntimeError("solana failed")
        )

        with (
            patch(
                "cdp.x402.core.wallets.provision.resolve_credentials",
                return_value=_resolved_credentials(),
            ),
            patch("cdp.x402.core.wallets.provision.CdpClient", return_value=cdp_client),
        ):
            with pytest.raises(RuntimeError, match="solana failed"):
                await provision_cdp_accounts(config=None, wallet_config=_resolved_wallet_config())

        cdp_client.close.assert_awaited_once()

    async def test_does_not_close_client_on_success(self) -> None:
        cdp_client = _cdp_client_mock()
        cdp_client.solana.get_or_create_account = AsyncMock(
            return_value=SimpleNamespace(address="svm-address")
        )
        cdp_client.evm.get_or_create_account = AsyncMock(
            return_value=SimpleNamespace(address="evm-address")
        )

        with (
            patch(
                "cdp.x402.core.wallets.provision.resolve_credentials",
                return_value=_resolved_credentials(),
            ),
            patch("cdp.x402.core.wallets.provision.CdpClient", return_value=cdp_client),
        ):
            result = await provision_cdp_accounts(
                config=None, wallet_config=_resolved_wallet_config()
            )

        assert result.evm_address == "evm-address"
        assert result.svm_address == "svm-address"
        cdp_client.close.assert_not_awaited()

    async def test_smart_wallet_re_raises_when_search_finds_nothing(self) -> None:
        """When 'owner already has smart wallet' error fires but the search finds no account,
        the original exception must re-raise (not be silently dropped).

        This guards the path:
            except Exception as exc:
                if not _is_owner_already_has_smart_wallet_error(exc): raise
                existing = await _find_smart_account_by_owner(...)
                if existing is None: raise   ← this branch
        """
        original_exc = SmartAccountAlreadyExistsError("Multiple smart wallets with the same owner")

        cdp_client = _cdp_client_mock()
        cdp_client.solana.get_or_create_account = AsyncMock(
            return_value=SimpleNamespace(address="svm-address")
        )
        owner_account = SimpleNamespace(address="0xowner")
        cdp_client.evm.get_or_create_account = AsyncMock(return_value=owner_account)
        # First call raises the "already has smart wallet" error.
        cdp_client.evm.get_or_create_smart_account = AsyncMock(side_effect=original_exc)
        # list_smart_accounts returns a page with no matching accounts and no next token.
        empty_page = SimpleNamespace(accounts=[], next_page_token=None)
        cdp_client.evm.list_smart_accounts = AsyncMock(return_value=empty_page)

        with (
            patch(
                "cdp.x402.core.wallets.provision.resolve_credentials",
                return_value=_resolved_credentials(),
            ),
            patch("cdp.x402.core.wallets.provision.CdpClient", return_value=cdp_client),
        ):
            with pytest.raises(SmartAccountAlreadyExistsError):
                await provision_cdp_accounts(
                    config=None,
                    wallet_config=_resolved_wallet_config("cdp-smart"),
                )

        # Client must be closed because an exception was raised.
        cdp_client.close.assert_awaited_once()
