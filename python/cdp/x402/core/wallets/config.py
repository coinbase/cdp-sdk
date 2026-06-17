"""Wallet configuration and resolution for CDP-backed x402 clients."""

from __future__ import annotations

import os
from typing import Any, Literal

from pydantic import ConfigDict, field_validator
from pydantic.dataclasses import dataclass

WalletType = Literal["cdp-eoa", "cdp-smart"]

_DEFAULT_ACCOUNT_NAME = "x402-server-wallet-1"
_SUPPORTED_WALLET_TYPES: tuple[str, ...] = ("cdp-eoa", "cdp-smart")


@dataclass(config=ConfigDict(extra="forbid"))
class WalletConfig:
    """Wallet configuration for the CDP x402 client."""

    type: WalletType | None = None
    account_name: str | None = None
    owner_account_name: str | None = None

    @field_validator("type", mode="before")
    @classmethod
    def _validate_type(cls, value: Any) -> Any:
        if value is None or value == "":
            return None
        if value not in _SUPPORTED_WALLET_TYPES:
            raise ValueError(
                f"Unsupported wallet type {value!r}. "
                f"Supported values: {', '.join(_SUPPORTED_WALLET_TYPES)}."
            )
        return value


@dataclass
class ResolvedWalletConfig:
    """Resolved wallet configuration with all required fields for the selected type."""

    type: WalletType
    account_name: str
    owner_account_name: str | None = None


def resolve_wallet_type(wallet_type: str | None) -> WalletType:
    """Resolve the wallet type string to a valid :type:`WalletType`."""
    if not wallet_type:
        return "cdp-eoa"
    if wallet_type in _SUPPORTED_WALLET_TYPES:
        return wallet_type  # type: ignore[return-value]
    raise ValueError(
        f"Unsupported wallet type {wallet_type!r}. "
        f"Supported values: {', '.join(_SUPPORTED_WALLET_TYPES)}."
    )


def resolve_wallet_config(config: WalletConfig | None = None) -> ResolvedWalletConfig:
    """Resolve wallet configuration from explicit config and environment variables."""
    raw_type = (config.type if config and config.type else None) or os.environ.get(
        "CDP_WALLET_TYPE"
    )
    wallet_type = resolve_wallet_type(raw_type)

    account_name = (
        (config.account_name if config else None)
        or os.environ.get("CDP_ACCOUNT_NAME")
        or _DEFAULT_ACCOUNT_NAME
    )

    owner_account_name = (config.owner_account_name if config else None) or os.environ.get(
        "CDP_OWNER_ACCOUNT_NAME"
    )

    if wallet_type == "cdp-smart" and not owner_account_name:
        raise ValueError(
            'Missing required owner account name for wallet type "cdp-smart". '
            "Provide it via wallet_config.owner_account_name or set the "
            "CDP_OWNER_ACCOUNT_NAME environment variable."
        )

    return ResolvedWalletConfig(
        type=wallet_type,
        account_name=account_name,
        owner_account_name=owner_account_name,
    )
