"""Unit tests for wallets/config.py."""

from __future__ import annotations

import pytest

from cdp.x402.core.wallets.config import (
    WalletConfig,
    resolve_wallet_config,
    resolve_wallet_type,
)


class TestResolveWalletType:
    def test_none_or_empty_defaults_to_cdp_eoa(self) -> None:
        assert resolve_wallet_type(None) == "cdp-eoa"
        assert resolve_wallet_type("") == "cdp-eoa"

    def test_cdp_eoa_accepted(self) -> None:
        assert resolve_wallet_type("cdp-eoa") == "cdp-eoa"

    def test_cdp_smart_accepted(self) -> None:
        assert resolve_wallet_type("cdp-smart") == "cdp-smart"

    def test_unknown_type_raises(self) -> None:
        with pytest.raises(ValueError, match="Unsupported wallet type"):
            resolve_wallet_type("unknown-type")


class TestResolveWalletConfig:
    def test_defaults_to_cdp_eoa_and_default_account_name(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        monkeypatch.delenv("CDP_WALLET_TYPE", raising=False)
        monkeypatch.delenv("CDP_ACCOUNT_NAME", raising=False)
        config = resolve_wallet_config()
        assert config.type == "cdp-eoa"
        assert config.account_name == "x402-server-wallet-1"
        assert config.owner_account_name is None

    def test_explicit_type_takes_precedence(self, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.setenv("CDP_WALLET_TYPE", "cdp-smart")
        monkeypatch.setenv("CDP_OWNER_ACCOUNT_NAME", "env-owner")
        config = resolve_wallet_config(WalletConfig(type="cdp-eoa"))
        assert config.type == "cdp-eoa"

    def test_reads_type_from_env(self, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.setenv("CDP_WALLET_TYPE", "cdp-eoa")
        config = resolve_wallet_config()
        assert config.type == "cdp-eoa"

    def test_reads_account_name_from_env(self, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.delenv("CDP_WALLET_TYPE", raising=False)
        monkeypatch.setenv("CDP_ACCOUNT_NAME", "env-wallet")
        config = resolve_wallet_config()
        assert config.account_name == "env-wallet"

    def test_explicit_account_name_takes_precedence(self, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.setenv("CDP_ACCOUNT_NAME", "env-wallet")
        config = resolve_wallet_config(WalletConfig(account_name="explicit-wallet"))
        assert config.account_name == "explicit-wallet"

    def test_cdp_smart_without_owner_raises(self, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.delenv("CDP_OWNER_ACCOUNT_NAME", raising=False)
        with pytest.raises(ValueError, match="owner"):
            resolve_wallet_config(WalletConfig(type="cdp-smart"))

    def test_cdp_smart_with_owner_from_env(self, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.setenv("CDP_OWNER_ACCOUNT_NAME", "env-owner")
        config = resolve_wallet_config(WalletConfig(type="cdp-smart"))
        assert config.type == "cdp-smart"
        assert config.owner_account_name == "env-owner"

    def test_cdp_smart_with_explicit_owner(self, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.delenv("CDP_OWNER_ACCOUNT_NAME", raising=False)
        config = resolve_wallet_config(
            WalletConfig(type="cdp-smart", owner_account_name="my-owner")
        )
        assert config.owner_account_name == "my-owner"


class TestWalletConfigValidation:
    def test_all_fields_omitted_passes_validation(self) -> None:
        config = WalletConfig()
        assert config.type is None
        assert config.account_name is None
        assert config.owner_account_name is None

    def test_invalid_type_raises(self) -> None:
        with pytest.raises(Exception, match="Unsupported wallet type"):
            WalletConfig(type="bogus")  # type: ignore[arg-type]

    def test_empty_string_normalises_to_none(self) -> None:
        config = WalletConfig(type="")  # type: ignore[arg-type]
        assert config.type is None

    def test_none_type_is_accepted(self) -> None:
        assert WalletConfig(type=None).type is None
