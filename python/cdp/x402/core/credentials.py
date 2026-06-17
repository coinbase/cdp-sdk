"""CDP credential resolution for x402 clients."""

from __future__ import annotations

import os
from dataclasses import dataclass
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from cdp.x402.core.client import CDPx402ClientConfig

__all__ = ["ResolvedCDPCredentials", "resolve_credentials", "CDPx402ClientConfig"]


@dataclass
class ResolvedCDPCredentials:
    """Resolved CDP credentials with all required fields present."""

    api_key_id: str
    api_key_secret: str
    wallet_secret: str


def resolve_credentials(config: CDPx402ClientConfig | None = None) -> ResolvedCDPCredentials:
    """Resolve CDP credentials from explicit config or environment variables.

    Explicit config always takes precedence over environment variables.

    :raises ValueError: If any required credential is missing.
    """
    api_key_id = (config.api_key_id if config else None) or os.environ.get("CDP_API_KEY_ID")
    api_key_secret = (config.api_key_secret if config else None) or os.environ.get(
        "CDP_API_KEY_SECRET"
    )
    wallet_secret = (config.wallet_secret if config else None) or os.environ.get(
        "CDP_WALLET_SECRET"
    )

    missing = []
    if not api_key_id:
        missing.append("CDP_API_KEY_ID")
    if not api_key_secret:
        missing.append("CDP_API_KEY_SECRET")
    if not wallet_secret:
        missing.append("CDP_WALLET_SECRET")

    if missing:
        raise ValueError(
            f"Missing required CDP credentials: {', '.join(missing)}. "
            "Provide them via config options or set the corresponding "
            "environment variables."
        )

    return ResolvedCDPCredentials(
        api_key_id=api_key_id,  # type: ignore[arg-type]
        api_key_secret=api_key_secret,  # type: ignore[arg-type]
        wallet_secret=wallet_secret,  # type: ignore[arg-type]
    )


def __getattr__(name: str) -> object:
    if name == "CDPx402ClientConfig":
        from cdp.x402.core.client import CDPx402ClientConfig

        return CDPx402ClientConfig
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
