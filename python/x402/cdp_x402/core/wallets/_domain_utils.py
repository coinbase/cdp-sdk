"""Shared EIP-712 domain conversion utilities for CDP signers."""

from __future__ import annotations

from typing import Any

#: Maps x402 snake_case domain field names to EIP-712 camelCase keys.
DOMAIN_FIELD_TO_EIP712: dict[str, str] = {
    "name": "name",
    "version": "version",
    "chain_id": "chainId",
    "verifying_contract": "verifyingContract",
    "salt": "salt",
}


def normalize_domain(domain: Any) -> dict[str, Any]:
    """Convert an x402 TypedDataDomain to a camelCase EIP-712 domain dict.

    Accepts dataclasses, plain dicts, or arbitrary objects with attributes.
    Snake_case keys (e.g. ``chain_id``) are mapped to their camelCase EIP-712
    equivalents; all other keys are passed through unchanged.

    :param domain: An x402 ``TypedDataDomain`` (dataclass, dict, or object).
    :returns: A camelCase dict suitable for passing to EIP-712 signers.
    """
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
    """Convert x402 TypedDataField lists to the list-of-dicts format expected by EIP-712 signers.

    :param types: A dict mapping type names to lists of ``TypedDataField`` objects or dicts.
    :returns: A dict mapping type names to lists of ``{"name": ..., "type": ...}`` dicts.
    """
    return {
        type_name: [
            {"name": f.name, "type": f.type} if hasattr(f, "name") else dict(f) for f in fields
        ]
        for type_name, fields in types.items()
    }
