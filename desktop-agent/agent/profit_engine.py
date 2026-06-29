"""Profit estimation, urgency scoring, and execution gating for liquidation targets."""

from __future__ import annotations

from agent.models import LiquidationTarget, WatchTarget

LIQUIDATION_CURSOR = 0.3
MAX_LIF = 1.15


def morpho_liquidation_incentive_factor(lltv_wad: int) -> float:
    """Morpho Blue LIF: min(1.15, 1 / (0.3*(1-lltv) + 0.7))."""
    lltv = lltv_wad / 1e18
    denominator = LIQUIDATION_CURSOR * (1 - lltv) + (1 - LIQUIDATION_CURSOR)
    if denominator <= 0:
        return 1.05
    return min(MAX_LIF, 1.0 / denominator)


def urgency_score(health_factor: float) -> float:
    """Lower HF = higher urgency. Used to prioritize execution queue."""
    if health_factor <= 0:
        return 100.0
    if health_factor >= 1.0:
        return max(0.0, (1.05 - health_factor) * 20)
    return 1.0 / health_factor


def estimate_profit_usd(
    debt_to_cover_human: float,
    liquidation_bonus_bps: int,
    *,
    slippage_bps: int = 50,
    gas_usd: float = 0.5,
    flash_fee_bps: int = 5,
) -> float:
    """Conservative net profit after bonus, slippage, flash fee, and gas."""
    bonus_mult = 1 + liquidation_bonus_bps / 10_000
    gross = debt_to_cover_human * bonus_mult
    slippage = debt_to_cover_human * slippage_bps / 10_000
    flash_fee = debt_to_cover_human * flash_fee_bps / 10_000
    return gross - slippage - flash_fee - gas_usd


def apply_urgency(targets: list[LiquidationTarget]) -> list[LiquidationTarget]:
    """Sort by urgency (lowest HF / highest profit) for competitive execution."""
    return sorted(
        targets,
        key=lambda t: (urgency_score(t.health_factor), t.estimated_profit_usd),
        reverse=True,
    )


def split_watch_targets(
    positions: list[dict],
    watch_hf_max: float = 1.05,
) -> tuple[list[WatchTarget], list[str]]:
    """Split Morpho API positions into watch-list and borrower addresses."""
    watches: list[WatchTarget] = []
    borrowers: set[str] = set()
    for pos in positions:
        user = pos.get("user", {}).get("address")
        if not user:
            continue
        borrowers.add(user)
        hf = float(pos.get("healthFactor") or 0)
        if hf <= 0 or hf >= watch_hf_max:
            continue
        market = pos.get("market", {})
        loan = market.get("loanAsset", {})
        coll = market.get("collateralAsset", {})
        state = pos.get("state", {})
        watches.append(
            WatchTarget(
                protocol_id="morpho",
                protocol_name="Morpho Blue",
                user=user,
                health_factor=hf,
                collateral_symbol=coll.get("symbol", "?"),
                debt_symbol=loan.get("symbol", "?"),
                debt_usd=float(state.get("borrowAssetsUsd") or 0),
                collateral_usd=float(state.get("collateralUsd") or 0),
                price_to_liquidation_pct=float(pos.get("priceVariationToLiquidationPrice") or 0),
                market_id=market.get("marketId", ""),
            )
        )
    watches.sort(key=lambda w: w.health_factor)
    return watches, sorted(borrowers)
