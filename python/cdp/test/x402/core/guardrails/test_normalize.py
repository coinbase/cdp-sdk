"""Unit tests for guardrails/normalize.py."""

from __future__ import annotations

import pytest

from cdp.x402.core.guardrails.normalize import normalize_asset, normalize_network, normalize_payee
from cdp.x402.core.guardrails.types import SpendControlError


class TestNormalizeNetwork:
    @pytest.mark.parametrize(
        "input_network, expected",
        [
            # Already CAIP-2 — passed through
            ("eip155:8453", "eip155:8453"),
            ("eip155:84532", "eip155:84532"),
            ("eip155:1", "eip155:1"),
            ("solana:mainnet", "solana:mainnet"),
            ("solana:devnet", "solana:devnet"),
            # Legacy EVM short forms
            ("base", "eip155:8453"),
            ("base-sepolia", "eip155:84532"),
            ("ethereum", "eip155:1"),
            ("ethereum-sepolia", "eip155:11155111"),
            ("polygon", "eip155:137"),
            ("polygon-amoy", "eip155:80002"),
            ("avalanche-fuji", "eip155:43113"),
            ("optimism", "eip155:10"),
            ("zora", "eip155:7777777"),
            ("bnb", "eip155:56"),
            # Legacy Solana
            ("solana", "solana:mainnet"),
            ("solana-devnet", "solana:devnet"),
            ("solana-testnet", "solana:testnet"),
        ],
    )
    def test_known_networks(self, input_network: str, expected: str) -> None:
        assert normalize_network(input_network) == expected

    def test_unknown_caip_shape_passed_through(self) -> None:
        result = normalize_network("cosmos:cosmoshub-4")
        assert result == "cosmos:cosmoshub-4"

    def test_unknown_non_caip_raises(self) -> None:
        with pytest.raises(SpendControlError) as exc_info:
            normalize_network("unknown-chain-xyz")
        assert exc_info.value.code == "network_not_allowed"

    def test_empty_string_raises(self) -> None:
        with pytest.raises(SpendControlError) as exc_info:
            normalize_network("")
        assert exc_info.value.code == "network_not_allowed"


class TestNormalizePayee:
    def test_evm_payee_lowercased(self) -> None:
        result = normalize_payee("eip155:8453", "0xABCDEF1234567890ABCDEF1234567890ABCDEF12")
        assert result == "0xabcdef1234567890abcdef1234567890abcdef12"

    def test_evm_payee_trimmed(self) -> None:
        result = normalize_payee("eip155:8453", "  0xABCDEF1234567890ABCDEF1234567890ABCDEF12  ")
        assert result == "0xabcdef1234567890abcdef1234567890abcdef12"

    def test_solana_payee_case_preserved(self) -> None:
        solana_addr = "7nYT1Dv9QfMsQHcZJbNyA9JkHqoVrpLmkCFfBjDqkbu"
        result = normalize_payee("solana:mainnet", solana_addr)
        assert result == solana_addr

    def test_legacy_evm_network_also_lowercases(self) -> None:
        result = normalize_payee("base", "0xABCDEF1234567890ABCDEF1234567890ABCDEF12")
        assert result == "0xabcdef1234567890abcdef1234567890abcdef12"

    def test_legacy_solana_network_preserves_case(self) -> None:
        addr = "7nYT1Dv9QfMsQHcZJbNyA9JkHqoVrpLmkCFfBjDqkbu"
        result = normalize_payee("solana", addr)
        assert result == addr

    def test_unknown_network_passes_through_trimmed(self) -> None:
        result = normalize_payee("cosmos:hub", "  MyAddress  ")
        assert result == "MyAddress"


class TestNormalizeAsset:
    def test_evm_contract_address_lowercased(self) -> None:
        result = normalize_asset("0x036CBD53842c5426634e7929541ec2318f3dCF7e")
        assert result == "0x036cbd53842c5426634e7929541ec2318f3dcf7e"

    def test_non_evm_asset_unchanged(self) -> None:
        spl_mint = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
        assert normalize_asset(spl_mint) == spl_mint

    def test_symbol_unchanged(self) -> None:
        assert normalize_asset("usdc") == "usdc"

    def test_trimmed(self) -> None:
        result = normalize_asset("  0x036cbd53842c5426634e7929541ec2318f3dcf7e  ")
        assert result == "0x036cbd53842c5426634e7929541ec2318f3dcf7e"

    def test_already_lowercase_unchanged(self) -> None:
        addr = "0x036cbd53842c5426634e7929541ec2318f3dcf7e"
        assert normalize_asset(addr) == addr
