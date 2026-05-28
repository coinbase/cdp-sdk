"""Unit tests for wallets/scw_signer.py — mirrors TypeScript scw-signer.test.ts."""

from __future__ import annotations

import concurrent.futures
from dataclasses import dataclass
from unittest.mock import AsyncMock, MagicMock

import pytest

import cdp_x402.core.wallets.scw_signer as scw_signer_module
from cdp_x402.core.wallets.scw_signer import (
    CdpSmartWalletSigner,
    _get_executor,
    from_cdp_smart_wallet,
    resolve_network_from_chain_id,
)

# ---------------------------------------------------------------------------
# resolve_network_from_chain_id
# ---------------------------------------------------------------------------


class TestResolveNetworkFromChainId:
    def test_resolves_known_chain_ids(self) -> None:
        assert resolve_network_from_chain_id(8453) == "base"
        assert resolve_network_from_chain_id(84532) == "base-sepolia"
        assert resolve_network_from_chain_id(42161) == "arbitrum"
        assert resolve_network_from_chain_id(10) == "optimism"
        assert resolve_network_from_chain_id(7777777) == "zora"
        assert resolve_network_from_chain_id(137) == "polygon"
        assert resolve_network_from_chain_id(56) == "bnb"
        assert resolve_network_from_chain_id(43114) == "avalanche"
        assert resolve_network_from_chain_id(11155111) == "ethereum-sepolia"

    def test_treats_unsupported_chains_as_unsupported(self) -> None:
        with pytest.raises(ValueError, match="Unsupported chain_id 1"):
            resolve_network_from_chain_id(1)
        with pytest.raises(ValueError, match="Unsupported chain_id 421614"):
            resolve_network_from_chain_id(421614)
        with pytest.raises(ValueError, match="Unsupported chain_id 480"):
            resolve_network_from_chain_id(480)

    def test_throws_when_chain_id_is_none(self) -> None:
        with pytest.raises(ValueError, match="domain.chain_id is missing"):
            resolve_network_from_chain_id(None)

    def test_throws_when_chain_id_is_not_supported(self) -> None:
        with pytest.raises(ValueError, match="Unsupported chain_id 99999"):
            resolve_network_from_chain_id(99999)

    def test_lists_supported_networks_in_error_message(self) -> None:
        with pytest.raises(ValueError, match="Supported networks:"):
            resolve_network_from_chain_id(12345)


# ---------------------------------------------------------------------------
# _get_executor — lazy thread pool
# ---------------------------------------------------------------------------


class TestGetExecutor:
    def test_executor_is_not_created_at_import_time(self, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.setattr(scw_signer_module, "_EXECUTOR", None)
        assert scw_signer_module._EXECUTOR is None

    def test_returns_thread_pool_executor(self, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.setattr(scw_signer_module, "_EXECUTOR", None)
        result = _get_executor()
        assert isinstance(result, concurrent.futures.ThreadPoolExecutor)

    def test_returns_same_instance_on_repeated_calls(self, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.setattr(scw_signer_module, "_EXECUTOR", None)
        first = _get_executor()
        second = _get_executor()
        assert first is second


# ---------------------------------------------------------------------------
# CdpSmartWalletSigner / from_cdp_smart_wallet
# ---------------------------------------------------------------------------


def _make_smart_account(
    address: str = "0xabcdef1234567890abcdef1234567890abcdef12",
) -> MagicMock:
    account = MagicMock()
    account.address = address
    account.sign_typed_data = AsyncMock(return_value="0xdeadbeef" + "00" * 61)
    return account


class TestCdpSmartWalletSigner:
    def test_address_is_smart_account_address(self) -> None:
        account = _make_smart_account("0xabcdef1234567890abcdef1234567890abcdef12")
        signer = CdpSmartWalletSigner(account)
        assert signer.address == "0xabcdef1234567890abcdef1234567890abcdef12"

    def test_calls_sign_typed_data_with_network_from_chain_id(self) -> None:
        account = _make_smart_account()
        signer = CdpSmartWalletSigner(account)

        signer.sign_typed_data(
            domain={"chainId": 11155111, "name": "USDC", "version": "2"},
            types={},
            primary_type="Transfer",
            message={"from": "0x1234", "to": "0x5678"},
        )

        account.sign_typed_data.assert_called_once()
        call_kwargs = account.sign_typed_data.call_args[1]
        assert call_kwargs["network"] == "ethereum-sepolia"

    def test_auto_resolves_mainnet_chain_id(self) -> None:
        account = _make_smart_account()
        signer = CdpSmartWalletSigner(account)

        signer.sign_typed_data(
            domain={"chainId": 8453},
            types={},
            primary_type="Transfer",
            message={},
        )

        call_kwargs = account.sign_typed_data.call_args[1]
        assert call_kwargs["network"] == "base"

    def test_passes_all_eip712_fields_through_to_account(self) -> None:
        account = _make_smart_account()
        signer = CdpSmartWalletSigner(account)

        domain = {"chainId": 8453, "name": "MyContract"}
        types = {"Transfer": [MagicMock(name="amount", type="uint256")]}
        primary_type = "Transfer"
        message = {"amount": "1000"}

        signer.sign_typed_data(
            domain=domain, types=types, primary_type=primary_type, message=message
        )

        call_kwargs = account.sign_typed_data.call_args[1]
        assert call_kwargs["network"] == "base"
        assert call_kwargs["message"] == message

    def test_throws_when_domain_chain_id_is_missing_from_dict(self) -> None:
        account = _make_smart_account()
        signer = CdpSmartWalletSigner(account)

        with pytest.raises(ValueError, match="domain.chain_id is missing"):
            signer.sign_typed_data(
                domain={"name": "USDC"},
                types={},
                primary_type="Transfer",
                message={},
            )

    def test_throws_when_chain_id_is_unsupported(self) -> None:
        account = _make_smart_account()
        signer = CdpSmartWalletSigner(account)

        with pytest.raises(ValueError, match="Unsupported chain_id 99999"):
            signer.sign_typed_data(
                domain={"chainId": 99999},
                types={},
                primary_type="Transfer",
                message={},
            )

    def test_returns_signature_bytes_from_account(self) -> None:
        account = _make_smart_account()
        expected_sig = b"\xde\xad\xbe\xef" + bytes(61)
        account.sign_typed_data.return_value = "0x" + expected_sig.hex()
        signer = CdpSmartWalletSigner(account)

        result = signer.sign_typed_data(
            domain={"chainId": 8453},
            types={},
            primary_type="Test",
            message={},
        )

        assert result == expected_sig

    def test_retries_with_fresh_client_when_loop_affinity_error(self) -> None:
        account = _make_smart_account()
        account.sign_typed_data = AsyncMock(
            side_effect=RuntimeError("attached to a different loop")
        )
        signer = CdpSmartWalletSigner(account)
        signer._sign_with_fresh_client = AsyncMock(return_value="0xdeadbeef" + "00" * 61)  # type: ignore[method-assign]

        result = signer.sign_typed_data(
            domain={"chainId": 8453},
            types={},
            primary_type="Test",
            message={},
        )

        assert result == b"\xde\xad\xbe\xef" + bytes(61)
        signer._sign_with_fresh_client.assert_called_once()  # type: ignore[attr-defined]

    @pytest.mark.asyncio
    async def test_retries_with_fresh_client_when_loop_affinity_error_inside_async_context(
        self,
    ) -> None:
        account = _make_smart_account()
        account.sign_typed_data = AsyncMock(
            side_effect=RuntimeError("attached to a different loop")
        )
        signer = CdpSmartWalletSigner(account)
        signer._sign_with_fresh_client = AsyncMock(return_value="0xdeadbeef" + "00" * 61)  # type: ignore[method-assign]

        result = signer.sign_typed_data(
            domain={"chainId": 8453},
            types={},
            primary_type="Test",
            message={},
        )

        assert result == b"\xde\xad\xbe\xef" + bytes(61)
        signer._sign_with_fresh_client.assert_called_once()  # type: ignore[attr-defined]

    def test_sign_typed_data_with_dataclass_domain(self) -> None:
        @dataclass
        class Domain:
            chain_id: int
            name: str | None = None

        account = _make_smart_account()
        signer = CdpSmartWalletSigner(account)

        signer.sign_typed_data(
            domain=Domain(chain_id=8453, name="USDC"),
            types={},
            primary_type="Transfer",
            message={},
        )

        call_kwargs = account.sign_typed_data.call_args[1]
        assert call_kwargs["network"] == "base"
        domain_data = call_kwargs["domain"]
        assert "chainId" in domain_data

    def test_converts_snake_case_domain_keys_to_camel_case(self) -> None:
        account = _make_smart_account()
        signer = CdpSmartWalletSigner(account)

        signer.sign_typed_data(
            domain={"chain_id": 8453, "verifying_contract": "0xabc"},
            types={},
            primary_type="Transfer",
            message={},
        )

        call_kwargs = account.sign_typed_data.call_args[1]
        domain_data = call_kwargs["domain"]
        assert "chainId" in domain_data
        assert "verifyingContract" in domain_data
        assert "chain_id" not in domain_data


class TestFromCdpSmartWallet:
    def test_returns_cdp_smart_wallet_signer(self) -> None:
        account = _make_smart_account()
        signer = from_cdp_smart_wallet(account)
        assert isinstance(signer, CdpSmartWalletSigner)

    def test_wraps_address(self) -> None:
        account = _make_smart_account("0x1111111111111111111111111111111111111111")
        signer = from_cdp_smart_wallet(account)
        assert signer.address == "0x1111111111111111111111111111111111111111"
