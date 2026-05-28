"""Spend controls (guardrails) for the CDP x402 client.

An opt-in API for limiting what an x402 client will pay for.  Spend controls
sit on top of the ``x402Client`` hook system so you don't have to implement
filtering or cap enforcement yourself.

Quick start::

    from cdp_x402.core.guardrails import apply_spend_controls, SpendControls, Amount

    USDC_BASE_SEPOLIA = "0x036cbd53842c5426634e7929541ec2318f3dcf7e"

    controls = SpendControls(
        max_amount_per_payment=Amount(atomic=2_000_000, asset=USDC_BASE_SEPOLIA),
        max_cumulative_spend=Amount(atomic=10_000_000, asset=USDC_BASE_SEPOLIA),
        max_cumulative_spend_window="24h",
        allowed_networks=["eip155:84532"],
        allowed_assets=[USDC_BASE_SEPOLIA],
    )
    apply_spend_controls(client, controls)
"""

from cdp_x402.core.guardrails.apply import (
    DEFAULT_APPROACHING_LIMIT_THRESHOLDS,
    ResolvedSpendControls,
    SpendControlsRegistry,
    apply_spend_controls,
    get_spend_controls_registry,
)
from cdp_x402.core.guardrails.normalize import normalize_asset, normalize_network, normalize_payee
from cdp_x402.core.guardrails.spend_tracker import (
    DEFAULT_MAX_LEDGER_ENTRIES,
    RecordSpendInput,
    SpendTracker,
    TotalSpendQuery,
)
from cdp_x402.core.guardrails.types import (
    Address,
    Amount,
    Asset,
    Duration,
    SpendControlError,
    SpendControlErrorCode,
    SpendControlErrorCodes,
    SpendControlErrorDetails,
    SpendControls,
    SpendLedgerEntry,
    SpendStore,
    parse_amount,
    parse_duration,
)
from cdp_x402.core.guardrails.wrap_httpx import (
    cdp_x402_http_adapter,
    cdp_x402_httpx_transport,
)

__all__ = [
    # Main entry point
    "apply_spend_controls",
    # Configuration type
    "SpendControls",
    # Error
    "SpendControlError",
    "SpendControlErrorCode",
    "SpendControlErrorCodes",
    "SpendControlErrorDetails",
    # Ledger
    "SpendTracker",
    "DEFAULT_MAX_LEDGER_ENTRIES",
    "RecordSpendInput",
    "TotalSpendQuery",
    "SpendStore",
    "SpendLedgerEntry",
    # Amount / Duration helpers
    "Amount",
    "Duration",
    "parse_amount",
    "parse_duration",
    # Normalization helpers
    "normalize_asset",
    "normalize_network",
    "normalize_payee",
    # Supporting types
    "Asset",
    "Address",
    # Resolved config snapshot
    "ResolvedSpendControls",
    "DEFAULT_APPROACHING_LIMIT_THRESHOLDS",
    # Settlement-aware registry
    "SpendControlsRegistry",
    "get_spend_controls_registry",
    # Settlement-aware HTTP transports (building blocks)
    "cdp_x402_httpx_transport",
    "cdp_x402_http_adapter",
]
