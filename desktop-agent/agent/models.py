"""Shared data models for liquidation scanning across protocols."""

from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Any


@dataclass
class WatchTarget:
    """Position near liquidation threshold — prep for oracle-triggered execution."""

    protocol_id: str
    protocol_name: str
    user: str
    health_factor: float
    collateral_symbol: str
    debt_symbol: str
    debt_usd: float
    collateral_usd: float
    price_to_liquidation_pct: float
    market_id: str = ""

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class LiquidationTarget:
    protocol_id: str
    protocol_name: str
    user: str
    health_factor: float
    total_collateral_usd: float
    total_debt_usd: float
    collateral_asset: str
    collateral_symbol: str
    debt_asset: str
    debt_symbol: str
    debt_to_cover: int
    debt_to_cover_human: float
    estimated_profit_usd: float
    swap_fee: int
    flash_amount: int
    liquidation_bonus_bps: int
    executable: bool = False
    urgency: float = 0.0
    market_id: str = ""

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)
