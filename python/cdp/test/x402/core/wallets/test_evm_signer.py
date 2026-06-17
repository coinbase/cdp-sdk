"""Unit tests for wallets/evm_signer.py."""

from __future__ import annotations

from unittest.mock import MagicMock, patch

from cdp.x402.core.wallets.evm_signer import CDPEVMSigner, from_cdp_evm_account


def _make_local_account(address: str = "0x1234567890abcdef1234567890abcdef12345678") -> MagicMock:
    acc = MagicMock()
    acc.address = address
    mock_signed = MagicMock()
    mock_signed.signature = bytes(65)
    acc.sign_typed_data = MagicMock(return_value=mock_signed)
    return acc


class TestCDPEVMSigner:
    def test_address_delegates_to_local_account(self) -> None:
        acc = _make_local_account("0xdeadbeef" + "00" * 16)
        signer = CDPEVMSigner(acc)
        assert signer.address == acc.address

    def test_sign_typed_data_returns_bytes(self) -> None:
        acc = _make_local_account()
        signer = CDPEVMSigner(acc)

        result = signer.sign_typed_data(
            domain={"name": "USDC", "version": "2", "chain_id": 84532},
            types={},
            primary_type="Transfer",
            message={"from": "0x1234", "to": "0x5678"},
        )

        assert isinstance(result, bytes)

    def test_sign_typed_data_calls_underlying_account(self) -> None:
        acc = _make_local_account()
        signer = CDPEVMSigner(acc)

        signer.sign_typed_data(
            domain={"name": "USDC", "version": "2", "chain_id": 84532},
            types={},
            primary_type="Transfer",
            message={"amount": "1000"},
        )

        acc.sign_typed_data.assert_called_once()

    def test_sign_typed_data_converts_snake_case_domain_to_camel_case(self) -> None:
        acc = _make_local_account()
        signer = CDPEVMSigner(acc)

        signer.sign_typed_data(
            domain={"chain_id": 84532, "verifying_contract": "0xabc"},
            types={},
            primary_type="Transfer",
            message={},
        )

        call_kwargs = acc.sign_typed_data.call_args
        full_message = call_kwargs[1]["full_message"]
        domain_data = full_message["domain"]
        assert "chainId" in domain_data
        assert "verifyingContract" in domain_data
        assert "chain_id" not in domain_data
        assert "verifying_contract" not in domain_data

    def test_sign_typed_data_passes_primary_type_to_full_message(self) -> None:
        acc = _make_local_account()
        signer = CDPEVMSigner(acc)

        signer.sign_typed_data(
            domain={"name": "USDC", "version": "2", "chain_id": 84532},
            types={"Transfer": []},
            primary_type="Transfer",
            message={"amount": "1000"},
        )

        call_kwargs = acc.sign_typed_data.call_args
        full_message = call_kwargs[1]["full_message"]
        assert full_message["primaryType"] == "Transfer"

    def test_sign_typed_data_with_dataclass_domain(self) -> None:
        from dataclasses import dataclass

        @dataclass
        class Domain:
            chain_id: int
            name: str | None = None

        acc = _make_local_account()
        signer = CDPEVMSigner(acc)

        result = signer.sign_typed_data(
            domain=Domain(chain_id=84532, name="USDC"),
            types={},
            primary_type="Transfer",
            message={},
        )

        assert isinstance(result, bytes)


class TestFromCDPEVMAccount:
    def test_returns_cdp_evm_signer(self) -> None:
        mock_server_account = MagicMock()
        mock_local_account = _make_local_account()

        with patch("cdp.EvmLocalAccount", return_value=mock_local_account):
            signer = from_cdp_evm_account(mock_server_account)

        assert isinstance(signer, CDPEVMSigner)

    def test_wraps_address_from_server_account(self) -> None:
        mock_server_account = MagicMock()
        mock_local_account = _make_local_account("0xabcdef1234567890abcdef1234567890abcdef12")

        with patch("cdp.EvmLocalAccount", return_value=mock_local_account):
            signer = from_cdp_evm_account(mock_server_account)

        assert signer.address == "0xabcdef1234567890abcdef1234567890abcdef12"
