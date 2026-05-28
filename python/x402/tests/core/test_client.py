"""Unit tests for core/client.py — CdpX402Client and create_cdp_x402_client."""

from __future__ import annotations

from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from cdp_x402.core.client import (
    CdpX402Client,
    CdpX402ClientConfig,
    CdpX402ClientResult,
    _find_smart_account_by_owner,
    create_cdp_x402_client,
)
from cdp_x402.core.guardrails.types import SpendControls
from cdp_x402.core.wallets.config import WalletConfig

MOCK_EVM_ADDRESS = "0x1234567890abcdef1234567890abcdef12345678"
MOCK_SCW_ADDRESS = "0xabcdef1234567890abcdef1234567890abcdef12"
MOCK_SVM_ADDRESS = "7nYT1Dv9QfMsQHcZJbNyA9JkHqoVrpLmkCFfBjDqkbu"
MOCK_SPEND_CONTROLS = SpendControls()


# ---------------------------------------------------------------------------
# CdpX402ClientConfig — pydantic validation
# ---------------------------------------------------------------------------


class TestCdpX402ClientConfigValidation:
    def test_all_fields_omitted_passes_validation(self) -> None:
        config = CdpX402ClientConfig()
        assert config.api_key_id is None
        assert config.api_key_secret is None
        assert config.wallet_secret is None
        assert config.wallet_config is None
        assert config.spend_controls is None

    def test_unknown_field_is_rejected(self) -> None:
        with pytest.raises(Exception):  # noqa: B017,PT011
            CdpX402ClientConfig(unknown_field="value")  # type: ignore[call-arg]

    def test_spend_controls_dict_is_coerced_to_spend_controls_instance(self) -> None:
        config = CdpX402ClientConfig(spend_controls={})  # type: ignore[arg-type]
        assert isinstance(config.spend_controls, SpendControls)

    def test_spend_controls_instance_is_preserved(self) -> None:
        controls = SpendControls()
        config = CdpX402ClientConfig(spend_controls=controls)
        assert config.spend_controls is controls

    def test_wallet_config_instance_is_accepted(self) -> None:
        wallet_cfg = WalletConfig(type="cdp-eoa")
        config = CdpX402ClientConfig(wallet_config=wallet_cfg)
        assert config.wallet_config is wallet_cfg


def _make_cdp_client_mock(
    evm_address: str = MOCK_EVM_ADDRESS,
    scw_address: str = MOCK_SCW_ADDRESS,
    svm_address: str = MOCK_SVM_ADDRESS,
) -> MagicMock:
    mock_evm_account = MagicMock()
    mock_evm_account.address = evm_address

    mock_scw = MagicMock()
    mock_scw.address = scw_address

    mock_svm_account = MagicMock()
    mock_svm_account.address = svm_address

    cdp_mock = MagicMock()
    cdp_mock.evm.get_or_create_account = AsyncMock(return_value=mock_evm_account)
    cdp_mock.evm.get_or_create_smart_account = AsyncMock(return_value=mock_scw)
    cdp_mock.solana.get_or_create_account = AsyncMock(return_value=mock_svm_account)
    return cdp_mock


# ---------------------------------------------------------------------------
# create_cdp_x402_client — cdp-eoa (default)
# ---------------------------------------------------------------------------


class TestCreateCdpX402ClientEoa:
    async def test_returns_client_result_with_evm_address(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        monkeypatch.setenv("CDP_API_KEY_ID", "key-id")
        monkeypatch.setenv("CDP_API_KEY_SECRET", "key-secret")
        monkeypatch.setenv("CDP_WALLET_SECRET", "wallet-secret")

        cdp_mock = _make_cdp_client_mock()

        with (
            patch("cdp_x402.core.client.CdpClient", return_value=cdp_mock),
            patch("cdp_x402.core.client.from_cdp_evm_account", return_value=MagicMock()),
            patch("cdp_x402.core.client.register_exact_evm_client"),
        ):
            result = await create_cdp_x402_client()

        assert isinstance(result, CdpX402ClientResult)
        assert result.evm_address == MOCK_EVM_ADDRESS
        assert result.owner_wallet is None

    async def test_uses_default_account_name(self, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.setenv("CDP_API_KEY_ID", "key-id")
        monkeypatch.setenv("CDP_API_KEY_SECRET", "key-secret")
        monkeypatch.setenv("CDP_WALLET_SECRET", "wallet-secret")

        cdp_mock = _make_cdp_client_mock()

        with (
            patch("cdp_x402.core.client.CdpClient", return_value=cdp_mock),
            patch("cdp_x402.core.client.from_cdp_evm_account", return_value=MagicMock()),
            patch("cdp_x402.core.client.register_exact_evm_client"),
        ):
            await create_cdp_x402_client()

        cdp_mock.evm.get_or_create_account.assert_called_once_with(name="x402-server-wallet-1")

    async def test_uses_custom_account_name(self, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.setenv("CDP_API_KEY_ID", "key-id")
        monkeypatch.setenv("CDP_API_KEY_SECRET", "key-secret")
        monkeypatch.setenv("CDP_WALLET_SECRET", "wallet-secret")

        cdp_mock = _make_cdp_client_mock()

        with (
            patch("cdp_x402.core.client.CdpClient", return_value=cdp_mock),
            patch("cdp_x402.core.client.from_cdp_evm_account", return_value=MagicMock()),
            patch("cdp_x402.core.client.register_exact_evm_client"),
        ):
            await create_cdp_x402_client(
                CdpX402ClientConfig(wallet_config=WalletConfig(account_name="my-wallet"))
            )

        cdp_mock.evm.get_or_create_account.assert_called_once_with(name="my-wallet")

    async def test_uses_account_name_from_env(self, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.setenv("CDP_API_KEY_ID", "key-id")
        monkeypatch.setenv("CDP_API_KEY_SECRET", "key-secret")
        monkeypatch.setenv("CDP_WALLET_SECRET", "wallet-secret")
        monkeypatch.setenv("CDP_ACCOUNT_NAME", "env-wallet")

        cdp_mock = _make_cdp_client_mock()

        with (
            patch("cdp_x402.core.client.CdpClient", return_value=cdp_mock),
            patch("cdp_x402.core.client.from_cdp_evm_account", return_value=MagicMock()),
            patch("cdp_x402.core.client.register_exact_evm_client"),
        ):
            await create_cdp_x402_client()

        cdp_mock.evm.get_or_create_account.assert_called_once_with(name="env-wallet")

    async def test_raises_when_credentials_missing(self, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.delenv("CDP_API_KEY_ID", raising=False)
        monkeypatch.delenv("CDP_API_KEY_SECRET", raising=False)
        monkeypatch.delenv("CDP_WALLET_SECRET", raising=False)

        with pytest.raises(ValueError, match="CDP_API_KEY_ID"):
            await create_cdp_x402_client()


# ---------------------------------------------------------------------------
# create_cdp_x402_client — cdp-smart
# ---------------------------------------------------------------------------


class TestCreateCdpX402ClientScw:
    async def test_provisions_owner_eoa_and_smart_account(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        monkeypatch.setenv("CDP_API_KEY_ID", "key-id")
        monkeypatch.setenv("CDP_API_KEY_SECRET", "key-secret")
        monkeypatch.setenv("CDP_WALLET_SECRET", "wallet-secret")

        cdp_mock = _make_cdp_client_mock()
        scw_config = CdpX402ClientConfig(
            wallet_config=WalletConfig(type="cdp-smart", owner_account_name="my-owner")
        )

        with (
            patch("cdp_x402.core.client.CdpClient", return_value=cdp_mock),
            patch("cdp_x402.core.client.from_cdp_smart_wallet", return_value=MagicMock()),
            patch("cdp_x402.core.client.register_exact_evm_client"),
        ):
            await create_cdp_x402_client(scw_config)

        cdp_mock.evm.get_or_create_account.assert_called_once_with(name="my-owner")
        cdp_mock.evm.get_or_create_smart_account.assert_called_once()

    async def test_returns_scw_address_and_owner_wallet(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        monkeypatch.setenv("CDP_API_KEY_ID", "key-id")
        monkeypatch.setenv("CDP_API_KEY_SECRET", "key-secret")
        monkeypatch.setenv("CDP_WALLET_SECRET", "wallet-secret")

        cdp_mock = _make_cdp_client_mock()
        scw_config = CdpX402ClientConfig(
            wallet_config=WalletConfig(type="cdp-smart", owner_account_name="my-owner")
        )

        with (
            patch("cdp_x402.core.client.CdpClient", return_value=cdp_mock),
            patch("cdp_x402.core.client.from_cdp_smart_wallet", return_value=MagicMock()),
            patch("cdp_x402.core.client.register_exact_evm_client"),
        ):
            result = await create_cdp_x402_client(scw_config)

        assert result.evm_address == MOCK_SCW_ADDRESS
        assert result.owner_wallet == "my-owner"

    async def test_uses_from_cdp_smart_wallet_for_signer(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        monkeypatch.setenv("CDP_API_KEY_ID", "key-id")
        monkeypatch.setenv("CDP_API_KEY_SECRET", "key-secret")
        monkeypatch.setenv("CDP_WALLET_SECRET", "wallet-secret")

        cdp_mock = _make_cdp_client_mock()
        scw_config = CdpX402ClientConfig(
            wallet_config=WalletConfig(type="cdp-smart", owner_account_name="my-owner")
        )

        with (
            patch("cdp_x402.core.client.CdpClient", return_value=cdp_mock),
            patch(
                "cdp_x402.core.client.from_cdp_smart_wallet", return_value=MagicMock()
            ) as mock_scw,
            patch("cdp_x402.core.client.register_exact_evm_client"),
        ):
            await create_cdp_x402_client(scw_config)

        mock_scw.assert_called_once()

    async def test_does_not_use_smart_wallet_for_eoa(self, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.setenv("CDP_API_KEY_ID", "key-id")
        monkeypatch.setenv("CDP_API_KEY_SECRET", "key-secret")
        monkeypatch.setenv("CDP_WALLET_SECRET", "wallet-secret")

        cdp_mock = _make_cdp_client_mock()

        with (
            patch("cdp_x402.core.client.CdpClient", return_value=cdp_mock),
            patch("cdp_x402.core.client.from_cdp_evm_account", return_value=MagicMock()),
            patch(
                "cdp_x402.core.client.from_cdp_smart_wallet", return_value=MagicMock()
            ) as mock_scw,
            patch("cdp_x402.core.client.register_exact_evm_client"),
        ):
            await create_cdp_x402_client()

        mock_scw.assert_not_called()
        cdp_mock.evm.get_or_create_smart_account.assert_not_called()

    async def test_uses_owner_account_name_from_env(self, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.setenv("CDP_API_KEY_ID", "key-id")
        monkeypatch.setenv("CDP_API_KEY_SECRET", "key-secret")
        monkeypatch.setenv("CDP_WALLET_SECRET", "wallet-secret")
        monkeypatch.setenv("CDP_OWNER_ACCOUNT_NAME", "env-owner")

        cdp_mock = _make_cdp_client_mock()

        with (
            patch("cdp_x402.core.client.CdpClient", return_value=cdp_mock),
            patch("cdp_x402.core.client.from_cdp_smart_wallet", return_value=MagicMock()),
            patch("cdp_x402.core.client.register_exact_evm_client"),
        ):
            await create_cdp_x402_client(
                CdpX402ClientConfig(wallet_config=WalletConfig(type="cdp-smart"))
            )

        cdp_mock.evm.get_or_create_account.assert_called_once_with(name="env-owner")


# ---------------------------------------------------------------------------
# CdpX402Client — lazy init
# ---------------------------------------------------------------------------


class TestCdpX402Client:
    def test_constructs_without_throwing(self) -> None:
        client = CdpX402Client()
        assert client is not None

    def test_evm_address_is_none_before_initialization(self) -> None:
        client = CdpX402Client()
        assert client.evm_address is None

    def test_owner_wallet_is_none_before_initialization(self) -> None:
        client = CdpX402Client()
        assert client.owner_wallet is None

    def _make_inner_mock(self) -> MagicMock:
        inner_mock = MagicMock()
        inner_mock.create_payment_payload = AsyncMock(return_value=MagicMock())
        inner_mock.register_policy = MagicMock(return_value=inner_mock)
        inner_mock.register = MagicMock(return_value=inner_mock)
        inner_mock.register_v1 = MagicMock(return_value=inner_mock)
        inner_mock.on_before_payment_creation = MagicMock(return_value=inner_mock)
        inner_mock.on_after_payment_creation = MagicMock(return_value=inner_mock)
        inner_mock.on_payment_creation_failure = MagicMock(return_value=inner_mock)
        inner_mock.get_registered_schemes = MagicMock(return_value={1: [], 2: []})
        return inner_mock

    def test_forwards_register_methods_to_inner_client(self) -> None:
        inner_mock = self._make_inner_mock()
        with patch("cdp_x402.core.client.x402Client", return_value=inner_mock):
            client = CdpX402Client()

        scheme = MagicMock()
        result = client.register("eip155:*", scheme).register_v1("eip155:1", scheme)

        assert result is client
        inner_mock.register.assert_called_once_with("eip155:*", scheme)
        inner_mock.register_v1.assert_called_once_with("eip155:1", scheme)

    def test_forwards_hooks_and_scheme_introspection_to_inner_client(self) -> None:
        inner_mock = self._make_inner_mock()
        with patch("cdp_x402.core.client.x402Client", return_value=inner_mock):
            client = CdpX402Client()

        hook = MagicMock()
        result = (
            client.on_before_payment_creation(hook)
            .on_after_payment_creation(hook)
            .on_payment_creation_failure(hook)
        )

        assert result is client
        inner_mock.on_before_payment_creation.assert_called_once_with(hook)
        inner_mock.on_after_payment_creation.assert_called_once_with(hook)
        inner_mock.on_payment_creation_failure.assert_called_once_with(hook)
        assert client.get_registered_schemes() == {1: [], 2: []}

    async def test_initializes_lazily_on_create_payment_payload(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        monkeypatch.setenv("CDP_API_KEY_ID", "key-id")
        monkeypatch.setenv("CDP_API_KEY_SECRET", "key-secret")
        monkeypatch.setenv("CDP_WALLET_SECRET", "wallet-secret")

        cdp_mock = _make_cdp_client_mock()
        inner_mock = self._make_inner_mock()

        with (
            patch("cdp_x402.core.client.CdpClient", return_value=cdp_mock) as mock_cdp_cls,
            patch("cdp_x402.core.client.from_cdp_evm_account", return_value=MagicMock()),
            patch("cdp_x402.core.client.register_exact_evm_client"),
            patch("cdp_x402.core.client.x402Client", return_value=inner_mock),
        ):
            client = CdpX402Client()
            mock_cdp_cls.assert_not_called()

            await client.create_payment_payload(MagicMock())
            mock_cdp_cls.assert_called_once()

    async def test_initializes_only_once_across_multiple_calls(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        monkeypatch.setenv("CDP_API_KEY_ID", "key-id")
        monkeypatch.setenv("CDP_API_KEY_SECRET", "key-secret")
        monkeypatch.setenv("CDP_WALLET_SECRET", "wallet-secret")

        cdp_mock = _make_cdp_client_mock()
        inner_mock = self._make_inner_mock()

        with (
            patch("cdp_x402.core.client.CdpClient", return_value=cdp_mock) as mock_cdp_cls,
            patch("cdp_x402.core.client.from_cdp_evm_account", return_value=MagicMock()),
            patch("cdp_x402.core.client.register_exact_evm_client"),
            patch("cdp_x402.core.client.x402Client", return_value=inner_mock),
        ):
            client = CdpX402Client()
            pr = MagicMock()
            await client.create_payment_payload(pr)
            await client.create_payment_payload(pr)

        assert mock_cdp_cls.call_count == 1

    async def test_retries_after_transient_failure(self, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.setenv("CDP_API_KEY_ID", "key-id")
        monkeypatch.setenv("CDP_API_KEY_SECRET", "key-secret")
        monkeypatch.setenv("CDP_WALLET_SECRET", "wallet-secret")

        cdp_mock = _make_cdp_client_mock()
        inner_mock = self._make_inner_mock()
        call_count = 0

        def side_effect(*args: Any, **kwargs: Any) -> Any:
            nonlocal call_count
            call_count += 1
            if call_count == 1:
                raise RuntimeError("transient error")
            return cdp_mock

        with (
            patch("cdp_x402.core.client.CdpClient", side_effect=side_effect),
            patch("cdp_x402.core.client.from_cdp_evm_account", return_value=MagicMock()),
            patch("cdp_x402.core.client.register_exact_evm_client"),
            patch("cdp_x402.core.client.x402Client", return_value=inner_mock),
        ):
            client = CdpX402Client()
            pr = MagicMock()

            with pytest.raises(RuntimeError, match="transient"):
                await client.create_payment_payload(pr)

            result = await client.create_payment_payload(pr)
            assert result is not None

        assert call_count == 2

    async def test_uses_from_cdp_smart_wallet_for_cdp_smart_type(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        monkeypatch.setenv("CDP_API_KEY_ID", "key-id")
        monkeypatch.setenv("CDP_API_KEY_SECRET", "key-secret")
        monkeypatch.setenv("CDP_WALLET_SECRET", "wallet-secret")

        cdp_mock = _make_cdp_client_mock()
        inner_mock = self._make_inner_mock()

        with (
            patch("cdp_x402.core.client.CdpClient", return_value=cdp_mock),
            patch(
                "cdp_x402.core.client.from_cdp_smart_wallet", return_value=MagicMock()
            ) as mock_scw,
            patch("cdp_x402.core.client.register_exact_evm_client"),
            patch("cdp_x402.core.client.x402Client", return_value=inner_mock),
        ):
            client = CdpX402Client(
                CdpX402ClientConfig(
                    wallet_config=WalletConfig(type="cdp-smart", owner_account_name="my-owner")
                )
            )
            await client.create_payment_payload(MagicMock())

        mock_scw.assert_called_once()

    async def test_owner_wallet_set_after_scw_initialization(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        monkeypatch.setenv("CDP_API_KEY_ID", "key-id")
        monkeypatch.setenv("CDP_API_KEY_SECRET", "key-secret")
        monkeypatch.setenv("CDP_WALLET_SECRET", "wallet-secret")

        cdp_mock = _make_cdp_client_mock()
        inner_mock = self._make_inner_mock()

        with (
            patch("cdp_x402.core.client.CdpClient", return_value=cdp_mock),
            patch("cdp_x402.core.client.from_cdp_smart_wallet", return_value=MagicMock()),
            patch("cdp_x402.core.client.register_exact_evm_client"),
            patch("cdp_x402.core.client.x402Client", return_value=inner_mock),
        ):
            client = CdpX402Client(
                CdpX402ClientConfig(
                    wallet_config=WalletConfig(type="cdp-smart", owner_account_name="my-owner")
                )
            )
            await client.create_payment_payload(MagicMock())

        assert client.evm_address == MOCK_SCW_ADDRESS
        assert client.owner_wallet == "my-owner"


# ---------------------------------------------------------------------------
# _find_smart_account_by_owner — pagination
# ---------------------------------------------------------------------------


class TestFindSmartAccountByOwner:
    def _make_account(self, address: str, owner_address: str) -> MagicMock:
        owner = MagicMock()
        owner.address = owner_address
        account = MagicMock()
        account.address = address
        account.owners = [owner]
        return account

    def _make_page(self, accounts: list[Any], next_page_token: str | None = None) -> MagicMock:
        page = MagicMock()
        page.accounts = accounts
        page.next_page_token = next_page_token
        return page

    async def test_finds_account_on_first_page(self) -> None:
        target = self._make_account("0xSCW", "0xOWNER")
        cdp_mock = MagicMock()
        cdp_mock.evm.list_smart_accounts = AsyncMock(
            return_value=self._make_page([target], next_page_token=None)
        )

        result = await _find_smart_account_by_owner(cdp_mock, "0xOWNER")

        assert result is target
        cdp_mock.evm.list_smart_accounts.assert_called_once_with(page_token=None)

    async def test_finds_account_on_second_page(self) -> None:
        other = self._make_account("0xOTHER", "0xOTHER_OWNER")
        target = self._make_account("0xSCW", "0xOWNER")
        cdp_mock = MagicMock()
        cdp_mock.evm.list_smart_accounts = AsyncMock(
            side_effect=[
                self._make_page([other], next_page_token="tok1"),
                self._make_page([target], next_page_token=None),
            ]
        )

        result = await _find_smart_account_by_owner(cdp_mock, "0xOWNER")

        assert result is target
        assert cdp_mock.evm.list_smart_accounts.call_count == 2

    async def test_returns_none_when_not_found_across_all_pages(self) -> None:
        other = self._make_account("0xOTHER", "0xOTHER_OWNER")
        cdp_mock = MagicMock()
        cdp_mock.evm.list_smart_accounts = AsyncMock(
            side_effect=[
                self._make_page([other], next_page_token="tok1"),
                self._make_page([], next_page_token=None),
            ]
        )

        result = await _find_smart_account_by_owner(cdp_mock, "0xOWNER")

        assert result is None

    async def test_address_comparison_is_case_insensitive(self) -> None:
        target = self._make_account("0xSCW", "0xabcDEF")
        cdp_mock = MagicMock()
        cdp_mock.evm.list_smart_accounts = AsyncMock(
            return_value=self._make_page([target], next_page_token=None)
        )

        result = await _find_smart_account_by_owner(cdp_mock, "0xABCdef")

        assert result is target


class TestCreateCdpX402ClientSpendControls:
    async def test_applies_spend_controls_when_provided(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        monkeypatch.setenv("CDP_API_KEY_ID", "key-id")
        monkeypatch.setenv("CDP_API_KEY_SECRET", "key-secret")
        monkeypatch.setenv("CDP_WALLET_SECRET", "wallet-secret")

        cdp_mock = _make_cdp_client_mock()

        with (
            patch("cdp_x402.core.client.CdpClient", return_value=cdp_mock),
            patch("cdp_x402.core.client.from_cdp_evm_account", return_value=MagicMock()),
            patch("cdp_x402.core.client.register_exact_evm_client"),
            patch("cdp_x402.core.guardrails.apply.apply_spend_controls") as mock_apply,
        ):
            config = CdpX402ClientConfig(spend_controls=MOCK_SPEND_CONTROLS)
            await create_cdp_x402_client(config)

        mock_apply.assert_called_once()

    async def test_no_spend_controls_applied_when_omitted(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        monkeypatch.setenv("CDP_API_KEY_ID", "key-id")
        monkeypatch.setenv("CDP_API_KEY_SECRET", "key-secret")
        monkeypatch.setenv("CDP_WALLET_SECRET", "wallet-secret")

        cdp_mock = _make_cdp_client_mock()

        with (
            patch("cdp_x402.core.client.CdpClient", return_value=cdp_mock),
            patch("cdp_x402.core.client.from_cdp_evm_account", return_value=MagicMock()),
            patch("cdp_x402.core.client.register_exact_evm_client"),
            patch("cdp_x402.core.guardrails.apply.apply_spend_controls") as mock_apply,
        ):
            await create_cdp_x402_client()

        mock_apply.assert_not_called()


class TestCdpX402ClientSpendControls:
    def _make_inner_mock(self) -> MagicMock:
        inner_mock = MagicMock()
        inner_mock.create_payment_payload = AsyncMock(return_value=MagicMock())
        inner_mock.register_policy = MagicMock(return_value=inner_mock)
        inner_mock.on_before_payment_creation = MagicMock(return_value=inner_mock)
        inner_mock.on_after_payment_creation = MagicMock(return_value=inner_mock)
        inner_mock.on_payment_creation_failure = MagicMock(return_value=inner_mock)
        return inner_mock

    async def test_wires_spend_controls_after_scheme_registration(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        monkeypatch.setenv("CDP_API_KEY_ID", "key-id")
        monkeypatch.setenv("CDP_API_KEY_SECRET", "key-secret")
        monkeypatch.setenv("CDP_WALLET_SECRET", "wallet-secret")

        cdp_mock = _make_cdp_client_mock()
        inner_mock = self._make_inner_mock()
        call_order: list[str] = []

        def mock_register(*args: Any, **kwargs: Any) -> None:
            call_order.append("register")

        def mock_apply(*args: Any, **kwargs: Any) -> None:
            call_order.append("apply")

        with (
            patch("cdp_x402.core.client.CdpClient", return_value=cdp_mock),
            patch("cdp_x402.core.client.from_cdp_evm_account", return_value=MagicMock()),
            patch("cdp_x402.core.client.register_exact_evm_client", side_effect=mock_register),
            patch("cdp_x402.core.guardrails.apply.apply_spend_controls", side_effect=mock_apply),
            patch("cdp_x402.core.client.x402Client", return_value=inner_mock),
        ):
            config = CdpX402ClientConfig(spend_controls=MOCK_SPEND_CONTROLS)
            client = CdpX402Client(config)
            await client.create_payment_payload(MagicMock())

        assert call_order == ["register", "apply"]

    async def test_no_spend_controls_when_omitted(self, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.setenv("CDP_API_KEY_ID", "key-id")
        monkeypatch.setenv("CDP_API_KEY_SECRET", "key-secret")
        monkeypatch.setenv("CDP_WALLET_SECRET", "wallet-secret")

        cdp_mock = _make_cdp_client_mock()
        inner_mock = self._make_inner_mock()

        with (
            patch("cdp_x402.core.client.CdpClient", return_value=cdp_mock),
            patch("cdp_x402.core.client.from_cdp_evm_account", return_value=MagicMock()),
            patch("cdp_x402.core.client.register_exact_evm_client"),
            patch("cdp_x402.core.guardrails.apply.apply_spend_controls") as mock_apply,
            patch("cdp_x402.core.client.x402Client", return_value=inner_mock),
        ):
            client = CdpX402Client()
            await client.create_payment_payload(MagicMock())

        mock_apply.assert_not_called()


# ---------------------------------------------------------------------------
# async_client() convenience method
# ---------------------------------------------------------------------------


class TestAsyncClientMethod:
    """CdpX402Client.async_client() returns a settlement-aware httpx.AsyncClient."""

    def test_returns_httpx_async_client(self) -> None:
        httpx = pytest.importorskip("httpx")
        client = CdpX402Client()
        with patch(
            "cdp_x402.core.guardrails.wrap_httpx.wrap_httpx_with_payment",
            return_value=httpx.AsyncClient(),
        ) as mock_wrap:
            result = client.async_client()

        mock_wrap.assert_called_once_with(client)
        assert isinstance(result, httpx.AsyncClient)

    def test_forwards_kwargs_to_wrap_httpx_with_payment(self) -> None:
        pytest.importorskip("httpx")
        client = CdpX402Client()
        sentinel = object()
        with patch(
            "cdp_x402.core.guardrails.wrap_httpx.wrap_httpx_with_payment",
            return_value=sentinel,
        ) as mock_wrap:
            result = client.async_client(timeout=30)

        mock_wrap.assert_called_once_with(client, timeout=30)
        assert result is sentinel


class TestCdpX402ClientResultAsyncClient:
    """CdpX402ClientResult.async_client() delegates to wrap_httpx_with_payment on .client."""

    def test_delegates_to_wrap_httpx_with_payment(self) -> None:
        pytest.importorskip("httpx")
        inner = MagicMock()
        result = CdpX402ClientResult(
            client=inner,
            cdp_client=MagicMock(),
            evm_address=MOCK_EVM_ADDRESS,
            svm_address=MOCK_SVM_ADDRESS,
        )
        sentinel = object()
        with patch(
            "cdp_x402.core.guardrails.wrap_httpx.wrap_httpx_with_payment",
            return_value=sentinel,
        ) as mock_wrap:
            out = result.async_client()

        mock_wrap.assert_called_once_with(inner)
        assert out is sentinel
