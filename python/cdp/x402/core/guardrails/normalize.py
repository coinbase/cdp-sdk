"""Normalization helpers for the spend-control allow-lists."""

from __future__ import annotations

import re

from x402.mechanisms.evm.v1.utils import get_evm_chain_id

from cdp.x402.core.guardrails.types import Address, Asset, SpendControlError

_CDP_EVM_NETWORK_CHAIN_ID_OVERRIDES: dict[str, int] = {
    "ethereum-sepolia": 11155111,
    "optimism": 10,
    "zora": 7777777,
    "bnb": 56,
}

_LEGACY_SVM_NETWORK_TO_CAIP: dict[str, str] = {
    "solana": "solana:mainnet",
    "solana-devnet": "solana:devnet",
    "solana-testnet": "solana:testnet",
}

_CAIP_PATTERN = re.compile(r"^[a-z0-9-]+:[a-zA-Z0-9\-_]+$")
_EVM_ADDRESS_PATTERN = re.compile(r"^0x[0-9a-fA-F]{40}$")


def _get_legacy_evm_chain_id(network: str) -> int | None:
    cdp_override = _CDP_EVM_NETWORK_CHAIN_ID_OVERRIDES.get(network)
    if cdp_override is not None:
        return cdp_override
    try:
        return get_evm_chain_id(network)
    except ValueError:
        return None


def _is_evm_network(network: str) -> bool:
    if network.startswith("eip155:"):
        return True
    return _get_legacy_evm_chain_id(network) is not None


def _is_svm_network(network: str) -> bool:
    if network.startswith("solana:"):
        return True
    canonical = _LEGACY_SVM_NETWORK_TO_CAIP.get(network)
    return canonical is not None and canonical.startswith("solana:")


def normalize_network(network: str) -> str:
    svm_canonical = _LEGACY_SVM_NETWORK_TO_CAIP.get(network)
    if svm_canonical:
        return svm_canonical

    evm_chain_id = _get_legacy_evm_chain_id(network)
    if evm_chain_id is not None:
        return f"eip155:{evm_chain_id}"

    if _CAIP_PATTERN.match(network):
        return network

    raise SpendControlError(
        "network_not_allowed",
        f"Network {network!r} is not a recognized CAIP-2 string or legacy v1 short form",
        {"network": network},
    )


def normalize_payee(network: str, payee: Address) -> Address:
    trimmed = payee.strip()
    if _is_evm_network(network):
        return trimmed.lower()
    if _is_svm_network(network):
        return trimmed
    return trimmed


def normalize_asset(asset: Asset) -> Asset:
    trimmed = asset.strip()
    if _EVM_ADDRESS_PATTERN.match(trimmed):
        return trimmed.lower()
    return trimmed
