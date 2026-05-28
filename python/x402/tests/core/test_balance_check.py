"""Unit tests for cdp_x402.core.balance_check."""

from __future__ import annotations

from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from cdp_x402.core.balance_check import (
    InsufficientFundsError,
    create_balance_check_hook,
)
from cdp_x402.core.client import CdpX402ClientConfig, create_cdp_x402_client

EVM_ADDRESS = "0x1234567890abcdef1234567890abcdef12345678"
SVM_ADDRESS = "7nYT1Dv9QfMsQHcZJbNyA9JkHqoVrpLmkCFfBjDqkbu"
USDC_BASE_SEPOLIA = "0x036CbD53842c5426634e7929541eC2318f3dCF7e"
USDC_BASE = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
USDC_SOLANA_DEVNET = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"

NETWORK_BASE_SEPOLIA = "eip155:84532"
NETWORK_BASE = "eip155:8453"
NETWORK_SOLANA_DEVNET = "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _evm_balance_entry(contract_address: str, amount: int) -> MagicMock:
    token = MagicMock()
    token.contract_address = contract_address
    amt = MagicMock()
    amt.amount = amount
    entry = MagicMock()
    entry.token = token
    entry.amount = amt
    return entry


def _svm_balance_entry(mint_address: str, amount: int) -> MagicMock:
    token = MagicMock()
    token.mint_address = mint_address
    amt = MagicMock()
    amt.amount = amount
    entry = MagicMock()
    entry.token = token
    entry.amount = amt
    return entry


def _make_cdp_client(
    evm_balances: list[Any] | None = None,
    evm_pages: list[dict[str, Any]] | None = None,
    svm_balances: list[Any] | None = None,
    evm_list_throws: Exception | None = None,
    svm_list_throws: Exception | None = None,
) -> MagicMock:
    """Build a minimal CDP client mock with controllable list_token_balances."""
    evm_call_count = 0

    async def evm_list_token_balances(**kwargs: Any) -> MagicMock:
        nonlocal evm_call_count
        if evm_list_throws is not None:
            raise evm_list_throws
        page = MagicMock()
        if evm_pages is not None:
            if evm_call_count < len(evm_pages):
                p = evm_pages[evm_call_count]
                page.balances = p.get("balances", [])
                page.next_page_token = p.get("next_page_token")
            else:
                page.balances = []
                page.next_page_token = None
            evm_call_count += 1
        else:
            page.balances = evm_balances or []
            page.next_page_token = None
        return page

    async def svm_list_token_balances(**kwargs: Any) -> MagicMock:
        if svm_list_throws is not None:
            raise svm_list_throws
        page = MagicMock()
        page.balances = svm_balances or []
        page.next_page_token = None
        return page

    cdp_mock = MagicMock()
    cdp_mock.evm = MagicMock()
    cdp_mock.evm.list_token_balances = AsyncMock(side_effect=evm_list_token_balances)
    cdp_mock.solana = MagicMock()
    cdp_mock.solana.list_token_balances = AsyncMock(side_effect=svm_list_token_balances)
    return cdp_mock


def _make_req(
    network: str,
    asset: str,
    amount: str | None = None,
    max_amount_required: str | None = None,
) -> MagicMock:
    req = MagicMock()
    req.network = network
    req.asset = asset
    req.amount = amount
    req.max_amount_required = max_amount_required
    return req


def _ctx(req: Any) -> MagicMock:
    ctx = MagicMock()
    ctx.selected_requirements = req
    return ctx


def _no_warn(message: str, cause: object | None = None) -> None:
    pass


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


class TestInsufficientFundsError:
    def test_attributes_are_set(self) -> None:
        err = InsufficientFundsError(
            required=1_000_000,
            available=42,
            asset=USDC_BASE,
            network=NETWORK_BASE,
            address=EVM_ADDRESS,
        )
        assert err.code == "insufficient_funds"
        assert err.required == 1_000_000
        assert err.available == 42
        assert err.asset == USDC_BASE
        assert err.network == NETWORK_BASE
        assert err.address == EVM_ADDRESS

    def test_message_contains_key_info(self) -> None:
        err = InsufficientFundsError(
            required=100,
            available=5,
            asset=USDC_BASE,
            network=NETWORK_BASE,
            address=EVM_ADDRESS,
        )
        assert EVM_ADDRESS in str(err)
        assert NETWORK_BASE in str(err)
        assert USDC_BASE in str(err)


class TestCreateBalanceCheckHook:
    async def test_passes_when_evm_balance_is_sufficient(self) -> None:
        cdp = _make_cdp_client(evm_balances=[_evm_balance_entry(USDC_BASE_SEPOLIA, 5_000_000)])
        hook = create_balance_check_hook(
            cdp_client=cdp,
            evm_address=EVM_ADDRESS,
            svm_address=SVM_ADDRESS,
            on_warning=_no_warn,
        )
        result = await hook(
            _ctx(_make_req(NETWORK_BASE_SEPOLIA, USDC_BASE_SEPOLIA, amount="1000000"))
        )
        assert result is None

    async def test_raises_when_evm_balance_is_below_required(self) -> None:
        cdp = _make_cdp_client(evm_balances=[_evm_balance_entry(USDC_BASE_SEPOLIA, 100)])
        hook = create_balance_check_hook(
            cdp_client=cdp,
            evm_address=EVM_ADDRESS,
            svm_address=SVM_ADDRESS,
            on_warning=_no_warn,
        )
        with pytest.raises(InsufficientFundsError) as exc_info:
            await hook(_ctx(_make_req(NETWORK_BASE_SEPOLIA, USDC_BASE_SEPOLIA, amount="1000000")))
        err = exc_info.value
        assert err.code == "insufficient_funds"
        assert err.required == 1_000_000
        assert err.available == 100

    async def test_populates_error_fields(self) -> None:
        cdp = _make_cdp_client(evm_balances=[_evm_balance_entry(USDC_BASE, 42)])
        hook = create_balance_check_hook(
            cdp_client=cdp,
            evm_address=EVM_ADDRESS,
            svm_address=SVM_ADDRESS,
            on_warning=_no_warn,
        )
        with pytest.raises(InsufficientFundsError) as exc_info:
            await hook(_ctx(_make_req(NETWORK_BASE, USDC_BASE, amount="1000000")))
        err = exc_info.value
        assert err.required == 1_000_000
        assert err.available == 42
        assert err.network == NETWORK_BASE
        assert err.asset == USDC_BASE
        assert err.address == EVM_ADDRESS

    async def test_evm_asset_comparison_is_case_insensitive(self) -> None:
        cdp = _make_cdp_client(evm_balances=[_evm_balance_entry(USDC_BASE_SEPOLIA, 5_000_000)])
        hook = create_balance_check_hook(
            cdp_client=cdp,
            evm_address=EVM_ADDRESS,
            svm_address=SVM_ADDRESS,
            on_warning=_no_warn,
        )
        result = await hook(
            _ctx(_make_req(NETWORK_BASE_SEPOLIA, USDC_BASE_SEPOLIA.lower(), amount="1000000"))
        )
        assert result is None

    async def test_skips_check_on_unsupported_network(self) -> None:
        cdp = _make_cdp_client()
        hook = create_balance_check_hook(
            cdp_client=cdp,
            evm_address=EVM_ADDRESS,
            svm_address=SVM_ADDRESS,
            on_warning=_no_warn,
        )
        result = await hook(
            _ctx(
                _make_req(
                    "eip155:137", "0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef", amount="1000000"
                )
            )
        )
        assert result is None
        cdp.evm.list_token_balances.assert_not_called()
        cdp.solana.list_token_balances.assert_not_called()

    async def test_raises_when_asset_not_in_balances(self) -> None:
        cdp = _make_cdp_client(
            evm_balances=[_evm_balance_entry("0xabcabcabcabcabcabcabcabcabcabcabcabcabca", 999)]
        )
        hook = create_balance_check_hook(
            cdp_client=cdp,
            evm_address=EVM_ADDRESS,
            svm_address=SVM_ADDRESS,
            on_warning=_no_warn,
        )
        with pytest.raises(InsufficientFundsError) as exc_info:
            await hook(_ctx(_make_req(NETWORK_BASE_SEPOLIA, USDC_BASE_SEPOLIA, amount="1000000")))
        assert exc_info.value.available == 0
        assert exc_info.value.required == 1_000_000

    async def test_raises_when_wallet_has_no_tokens_at_all(self) -> None:
        cdp = _make_cdp_client(evm_balances=[])
        hook = create_balance_check_hook(
            cdp_client=cdp,
            evm_address=EVM_ADDRESS,
            svm_address=SVM_ADDRESS,
            on_warning=_no_warn,
        )
        with pytest.raises(InsufficientFundsError) as exc_info:
            await hook(_ctx(_make_req(NETWORK_BASE_SEPOLIA, USDC_BASE_SEPOLIA, amount="1000000")))
        assert exc_info.value.available == 0
        assert exc_info.value.required == 1_000_000
        assert exc_info.value.address == EVM_ADDRESS

    async def test_returns_early_when_asset_found_on_first_page(self) -> None:
        pages = [
            {
                "balances": [_evm_balance_entry(USDC_BASE_SEPOLIA, 5_000_000)],
                "next_page_token": "tok",
            },
            {"balances": [_evm_balance_entry(USDC_BASE_SEPOLIA, 999_999)], "next_page_token": None},
        ]
        cdp = _make_cdp_client(evm_pages=pages)
        hook = create_balance_check_hook(
            cdp_client=cdp,
            evm_address=EVM_ADDRESS,
            svm_address=SVM_ADDRESS,
            on_warning=_no_warn,
        )
        result = await hook(
            _ctx(_make_req(NETWORK_BASE_SEPOLIA, USDC_BASE_SEPOLIA, amount="1000000"))
        )
        assert result is None
        assert cdp.evm.list_token_balances.call_count == 1

    async def test_continues_paginating_when_asset_not_on_first_page(self) -> None:
        pages = [
            {
                "balances": [
                    _evm_balance_entry("0xother000000000000000000000000000000000000", 999)
                ],
                "next_page_token": "tok",
            },
            {
                "balances": [_evm_balance_entry(USDC_BASE_SEPOLIA, 5_000_000)],
                "next_page_token": None,
            },
        ]
        cdp = _make_cdp_client(evm_pages=pages)
        hook = create_balance_check_hook(
            cdp_client=cdp,
            evm_address=EVM_ADDRESS,
            svm_address=SVM_ADDRESS,
            on_warning=_no_warn,
        )
        result = await hook(
            _ctx(_make_req(NETWORK_BASE_SEPOLIA, USDC_BASE_SEPOLIA, amount="1000000"))
        )
        assert result is None
        assert cdp.evm.list_token_balances.call_count == 2

    async def test_falls_back_to_max_amount_required_when_amount_absent(self) -> None:
        cdp = _make_cdp_client(evm_balances=[_evm_balance_entry(USDC_BASE_SEPOLIA, 100)])
        hook = create_balance_check_hook(
            cdp_client=cdp,
            evm_address=EVM_ADDRESS,
            svm_address=SVM_ADDRESS,
            on_warning=_no_warn,
        )
        with pytest.raises(InsufficientFundsError):
            await hook(
                _ctx(
                    _make_req(
                        NETWORK_BASE_SEPOLIA, USDC_BASE_SEPOLIA, max_amount_required="1000000"
                    )
                )
            )

    async def test_skips_check_when_amount_is_none(self) -> None:
        cdp = _make_cdp_client()
        hook = create_balance_check_hook(
            cdp_client=cdp,
            evm_address=EVM_ADDRESS,
            svm_address=SVM_ADDRESS,
            on_warning=_no_warn,
        )
        result = await hook(_ctx(_make_req(NETWORK_BASE_SEPOLIA, USDC_BASE_SEPOLIA, amount=None)))
        assert result is None
        cdp.evm.list_token_balances.assert_not_called()

    async def test_skips_check_when_amount_is_zero(self) -> None:
        cdp = _make_cdp_client()
        hook = create_balance_check_hook(
            cdp_client=cdp,
            evm_address=EVM_ADDRESS,
            svm_address=SVM_ADDRESS,
            on_warning=_no_warn,
        )
        result = await hook(_ctx(_make_req(NETWORK_BASE_SEPOLIA, USDC_BASE_SEPOLIA, amount="0")))
        assert result is None
        cdp.evm.list_token_balances.assert_not_called()

    async def test_proceeds_when_evm_balance_api_raises(self) -> None:
        warnings: list[str] = []

        def capture_warn(message: str, cause: object | None = None) -> None:
            warnings.append(message)

        cdp = _make_cdp_client(evm_list_throws=RuntimeError("network blip"))
        hook = create_balance_check_hook(
            cdp_client=cdp,
            evm_address=EVM_ADDRESS,
            svm_address=SVM_ADDRESS,
            on_warning=capture_warn,
        )
        result = await hook(
            _ctx(_make_req(NETWORK_BASE_SEPOLIA, USDC_BASE_SEPOLIA, amount="1000000"))
        )
        assert result is None
        assert len(warnings) == 1
        assert "proceeding without check" in warnings[0]

    async def test_passes_when_solana_balance_is_sufficient(self) -> None:
        cdp = _make_cdp_client(svm_balances=[_svm_balance_entry(USDC_SOLANA_DEVNET, 5_000_000)])
        hook = create_balance_check_hook(
            cdp_client=cdp,
            evm_address=EVM_ADDRESS,
            svm_address=SVM_ADDRESS,
            on_warning=_no_warn,
        )
        result = await hook(
            _ctx(_make_req(NETWORK_SOLANA_DEVNET, USDC_SOLANA_DEVNET, amount="1000000"))
        )
        assert result is None

    async def test_raises_when_solana_balance_is_below_required(self) -> None:
        cdp = _make_cdp_client(svm_balances=[_svm_balance_entry(USDC_SOLANA_DEVNET, 100)])
        hook = create_balance_check_hook(
            cdp_client=cdp,
            evm_address=EVM_ADDRESS,
            svm_address=SVM_ADDRESS,
            on_warning=_no_warn,
        )
        with pytest.raises(InsufficientFundsError) as exc_info:
            await hook(_ctx(_make_req(NETWORK_SOLANA_DEVNET, USDC_SOLANA_DEVNET, amount="1000000")))
        err = exc_info.value
        assert err.address == SVM_ADDRESS
        assert err.available == 100
        assert err.required == 1_000_000

    async def test_proceeds_when_solana_balance_api_raises(self) -> None:
        warnings: list[str] = []

        def capture_warn(message: str, cause: object | None = None) -> None:
            warnings.append(message)

        cdp = _make_cdp_client(svm_list_throws=RuntimeError("network blip"))
        hook = create_balance_check_hook(
            cdp_client=cdp,
            evm_address=EVM_ADDRESS,
            svm_address=SVM_ADDRESS,
            on_warning=capture_warn,
        )
        result = await hook(
            _ctx(_make_req(NETWORK_SOLANA_DEVNET, USDC_SOLANA_DEVNET, amount="1000000"))
        )
        assert result is None
        assert len(warnings) == 1
        assert "proceeding without check" in warnings[0]

    async def test_skips_unparseable_amount(self) -> None:
        cdp = _make_cdp_client()
        hook = create_balance_check_hook(
            cdp_client=cdp,
            evm_address=EVM_ADDRESS,
            svm_address=SVM_ADDRESS,
            on_warning=_no_warn,
        )
        result = await hook(
            _ctx(_make_req(NETWORK_BASE_SEPOLIA, USDC_BASE_SEPOLIA, amount="not-a-number"))
        )
        assert result is None
        cdp.evm.list_token_balances.assert_not_called()


class TestBalanceCheckWiredInClient:
    """Verifies that _setup_cdp_signers registers the balance hook correctly."""

    def _make_cdp_mock(self) -> MagicMock:
        mock_evm_account = MagicMock()
        mock_evm_account.address = "0xabc"
        mock_svm_account = MagicMock()
        mock_svm_account.address = SVM_ADDRESS
        cdp_mock = MagicMock()
        cdp_mock.evm.get_or_create_account = AsyncMock(return_value=mock_evm_account)
        cdp_mock.solana.get_or_create_account = AsyncMock(return_value=mock_svm_account)
        return cdp_mock

    async def test_hook_is_registered_by_default(self, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.setenv("CDP_API_KEY_ID", "key-id")
        monkeypatch.setenv("CDP_API_KEY_SECRET", "key-secret")
        monkeypatch.setenv("CDP_WALLET_SECRET", "wallet-secret")

        inner_mock = MagicMock()
        inner_mock.on_before_payment_creation = MagicMock(return_value=inner_mock)

        with (
            patch("cdp_x402.core.client.CdpClient", return_value=self._make_cdp_mock()),
            patch("cdp_x402.core.client.from_cdp_evm_account", return_value=MagicMock()),
            patch("cdp_x402.core.client.register_exact_evm_client"),
            patch("cdp_x402.core.client.x402Client", return_value=inner_mock),
        ):
            await create_cdp_x402_client()

        inner_mock.on_before_payment_creation.assert_called_once()

    async def test_hook_is_not_registered_when_disabled(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        monkeypatch.setenv("CDP_API_KEY_ID", "key-id")
        monkeypatch.setenv("CDP_API_KEY_SECRET", "key-secret")
        monkeypatch.setenv("CDP_WALLET_SECRET", "wallet-secret")

        inner_mock = MagicMock()
        inner_mock.on_before_payment_creation = MagicMock(return_value=inner_mock)

        with (
            patch("cdp_x402.core.client.CdpClient", return_value=self._make_cdp_mock()),
            patch("cdp_x402.core.client.from_cdp_evm_account", return_value=MagicMock()),
            patch("cdp_x402.core.client.register_exact_evm_client"),
            patch("cdp_x402.core.client.x402Client", return_value=inner_mock),
        ):
            await create_cdp_x402_client(CdpX402ClientConfig(disable_preflight_balance_check=True))

        inner_mock.on_before_payment_creation.assert_not_called()

    async def test_hook_is_not_registered_when_env_var_set(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        monkeypatch.setenv("CDP_API_KEY_ID", "key-id")
        monkeypatch.setenv("CDP_API_KEY_SECRET", "key-secret")
        monkeypatch.setenv("CDP_WALLET_SECRET", "wallet-secret")
        monkeypatch.setenv("CDP_DISABLE_PREFLIGHT_BALANCE_CHECK", "true")

        inner_mock = MagicMock()
        inner_mock.on_before_payment_creation = MagicMock(return_value=inner_mock)

        with (
            patch("cdp_x402.core.client.CdpClient", return_value=self._make_cdp_mock()),
            patch("cdp_x402.core.client.from_cdp_evm_account", return_value=MagicMock()),
            patch("cdp_x402.core.client.register_exact_evm_client"),
            patch("cdp_x402.core.client.x402Client", return_value=inner_mock),
        ):
            await create_cdp_x402_client()

        inner_mock.on_before_payment_creation.assert_not_called()

    async def test_rpc_urls_from_env_var(self, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.setenv("CDP_API_KEY_ID", "key-id")
        monkeypatch.setenv("CDP_API_KEY_SECRET", "key-secret")
        monkeypatch.setenv("CDP_WALLET_SECRET", "wallet-secret")
        monkeypatch.setenv(
            "CDP_RPC_URLS",
            '{"eip155:8453":"https://custom-base-rpc.example.com"}',
        )

        captured: dict[str, object] = {}
        inner_mock = MagicMock()

        def capture_hook(**kwargs: object) -> MagicMock:
            captured.update(kwargs)
            return MagicMock()

        with (
            patch("cdp_x402.core.client.CdpClient", return_value=self._make_cdp_mock()),
            patch("cdp_x402.core.client.from_cdp_evm_account", return_value=MagicMock()),
            patch("cdp_x402.core.client.register_exact_evm_client"),
            patch("cdp_x402.core.client.x402Client", return_value=inner_mock),
            patch("cdp_x402.core.client.create_balance_check_hook", side_effect=capture_hook),
        ):
            await create_cdp_x402_client()

        assert captured.get("rpc_urls") == {"eip155:8453": "https://custom-base-rpc.example.com"}

    async def test_explicit_rpc_urls_override_env_var(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        monkeypatch.setenv("CDP_API_KEY_ID", "key-id")
        monkeypatch.setenv("CDP_API_KEY_SECRET", "key-secret")
        monkeypatch.setenv("CDP_WALLET_SECRET", "wallet-secret")
        monkeypatch.setenv("CDP_RPC_URLS", '{"eip155:8453":"https://env-rpc.example.com"}')

        captured: dict[str, object] = {}
        inner_mock = MagicMock()

        def capture_hook(**kwargs: object) -> MagicMock:
            captured.update(kwargs)
            return MagicMock()

        with (
            patch("cdp_x402.core.client.CdpClient", return_value=self._make_cdp_mock()),
            patch("cdp_x402.core.client.from_cdp_evm_account", return_value=MagicMock()),
            patch("cdp_x402.core.client.register_exact_evm_client"),
            patch("cdp_x402.core.client.x402Client", return_value=inner_mock),
            patch("cdp_x402.core.client.create_balance_check_hook", side_effect=capture_hook),
        ):
            await create_cdp_x402_client(
                CdpX402ClientConfig(rpc_urls={"eip155:8453": "https://config-rpc.example.com"})
            )

        assert captured.get("rpc_urls") == {"eip155:8453": "https://config-rpc.example.com"}
