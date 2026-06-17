"""Shared EIP-712 domain conversion utilities for CDP signers."""

from __future__ import annotations

from typing import Any

DOMAIN_FIELD_TO_EIP712: dict[str, str] = {
    "name": "name",
    "version": "version",
    "chain_id": "chainId",
    "verifying_contract": "verifyingContract",
    "salt": "salt",
}


def normalize_domain(domain: Any) -> dict[str, Any]:
    """Convert an x402 TypedDataDomain to a camelCase EIP-712 domain dict."""
    if hasattr(domain, "__dataclass_fields__"):
        return {
            DOMAIN_FIELD_TO_EIP712.get(k, k): getattr(domain, k)
            for k in domain.__dataclass_fields__
            if getattr(domain, k) is not None
        }
    if isinstance(domain, dict):
        return {
            (DOMAIN_FIELD_TO_EIP712[k] if k in DOMAIN_FIELD_TO_EIP712 else k): v
            for k, v in domain.items()
        }
    return {
        (DOMAIN_FIELD_TO_EIP712[k] if k in DOMAIN_FIELD_TO_EIP712 else k): v
        for k, v in vars(domain).items()
    }


def normalize_types(types: dict[str, list[Any]]) -> dict[str, list[dict[str, str]]]:
    """Convert x402 TypedDataField lists to the list-of-dicts format for EIP-712 signers."""
    return {
        type_name: [
            {"name": f.name, "type": f.type} if hasattr(f, "name") else dict(f) for f in fields
        ]
        for type_name, fields in types.items()
    }
