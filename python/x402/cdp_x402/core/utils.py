"""Shared internal utilities for cdp_x402."""

from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger(__name__)


def read_required_atomic(req: Any) -> int | None:
    """Read the payment amount from a ``PaymentRequirements`` as an ``int``.

    Supports both V2 (``amount``) and V1 (``max_amount_required``). Returns
    ``None`` when neither field is present or parseable so callers can degrade
    gracefully instead of blocking payments on a parsing edge case.
    """
    raw: str | None = None
    if hasattr(req, "amount") and req.amount is not None:
        raw = req.amount
    elif hasattr(req, "max_amount_required") and req.max_amount_required is not None:
        raw = req.max_amount_required

    if raw is None:
        return None
    try:
        parsed = int(raw)
        return parsed if parsed >= 0 else None
    except (ValueError, TypeError):
        return None


def default_warn(message: str, cause: object | None = None) -> None:
    """Log a warning via :mod:`logging` at WARNING level.

    Used as the default ``on_warning`` callback when no custom handler is
    provided. ``cause`` is forwarded as ``exc_info`` when it is an exception.
    """
    if cause is None:
        logger.warning("[cdp_x402] %s", message)
    else:
        logger.warning(
            "[cdp_x402] %s", message, exc_info=cause if isinstance(cause, BaseException) else None
        )
