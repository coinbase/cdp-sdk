"""Normalization helpers for the spend-control allow-lists.

Allow-list comparisons need to be consistent with the values that appear in a
``PaymentRequirements`` payload. The rules per chain family are:

- **EVM**: Addresses and contract identifiers are compared
  case-insensitively.  Both CAIP-2 (``"eip155:8453"``) and legacy short
  forms (``"base"``, ``"base-sepolia"``, etc.) are recognized.
- **Solana**: Addresses and SPL mints are case-sensitive and passed through
  as-is.
- **Other chains**: Passed through unchanged.
"""

from __future__ import annotations

import re

from x402.mechanisms.evm.v1.utils import get_evm_chain_id

from cdp_x402.core.guardrails.types import Address, Asset, SpendControlError

# ---------------------------------------------------------------------------
# Known network mappings
# ---------------------------------------------------------------------------

# CDP aliases that are not part of x402's v1 network map.
_CDP_EVM_NETWORK_CHAIN_ID_OVERRIDES: dict[str, int] = {
    "ethereum-sepolia": 11155111,
    "optimism": 10,
    "zora": 7777777,
    "bnb": 56,
}

# Legacy Solana network strings → CAIP-2 equivalents
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
    """Convert a network identifier to its canonical CAIP-2 form.

    Accepts CAIP-2 strings (``"eip155:8453"``) and legacy short forms
    (``"base"``, ``"base-sepolia"``, ``"solana-devnet"``, …). Unknown but
    CAIP-shaped strings are returned as-is.

    :raises SpendControlError: ``"network_not_allowed"`` if the input is not
        a recognized short form or a valid CAIP-2 string.
    """
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
    """Normalize a payee address for allow-list comparisons.

    - EVM addresses are lower-cased (checksumming is ignored).
    - Solana addresses are returned unchanged (case-sensitive).
    - Whitespace is trimmed on both sides.
    """
    trimmed = payee.strip()
    if _is_evm_network(network):
        return trimmed.lower()
    if _is_svm_network(network):
        return trimmed
    return trimmed


def normalize_asset(asset: Asset) -> Asset:
    """Normalize an asset identifier for allow-list comparisons.

    EVM contract addresses (``0x`` + 40 hex chars) are lower-cased.
    Everything else (Solana mints, symbolic names) is returned unchanged.
    """
    trimmed = asset.strip()
    if _EVM_ADDRESS_PATTERN.match(trimmed):
        return trimmed.lower()
    return trimmed
