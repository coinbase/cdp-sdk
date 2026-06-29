"""Morpho Blue liquidation scanner — GraphQL API + on-chain verification."""

from __future__ import annotations

import json
import logging
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import aiohttp
from web3 import Web3

from agent.models import LiquidationTarget
from agent.profit_engine import estimate_profit_usd, morpho_liquidation_incentive_factor, urgency_score
from agent.protocols.base import ProtocolScanner
from agent.protocols.morpho_base import (
    BLUE_CHIP_SYMBOLS,
    MORPHO_API_URL,
    MORPHO_CHAIN_ID,
)
from config.settings import AgentSettings

logger = logging.getLogger(__name__)

BORROWERS_QUERY = """
query Borrowers($first: Int!, $skip: Int!) {
  marketPositions(
    first: $first
    skip: $skip
    where: { chainId_in: [%d], borrowShares_gte: "1" }
    orderBy: BorrowShares
    orderDirection: Desc
  ) {
    items {
      user { address }
      healthFactor
      priceVariationToLiquidationPrice
      state { borrowAssets borrowAssetsUsd collateral collateralUsd }
      market {
        marketId lltv oracleAddress irmAddress
        loanAsset { address symbol decimals }
        collateralAsset { address symbol decimals }
      }
    }
  }
}
""" % MORPHO_CHAIN_ID

WATCH_QUERY = """
query Watch($hf: Float!) {
  marketPositions(
    first: 50
    where: { chainId_in: [%d], healthFactor_gte: 1.0, healthFactor_lte: $hf }
    orderBy: HealthFactor
    orderDirection: Asc
  ) {
    items {
      user { address }
      healthFactor
      priceVariationToLiquidationPrice
      state { borrowAssetsUsd collateralUsd }
      market {
        marketId
        loanAsset { symbol }
        collateralAsset { symbol }
      }
    }
  }
}
""" % MORPHO_CHAIN_ID


class MorphoScanner(ProtocolScanner):
    protocol_id = "morpho"
    display_name = "Morpho Blue"
    executable = False

    def __init__(self, settings: AgentSettings, w3: Web3) -> None:
        super().__init__(settings, w3)
        if settings.network != "base":
            raise ValueError("Morpho scanner only supports Base mainnet")
        self._watch_cache: list[dict[str, Any]] = []

    def _cache_path(self) -> Path:
        return self.settings.borrower_cache_dir / f"{self.protocol_id}.json"

    async def _graphql(self, query: str, variables: dict | None = None) -> dict:
        async with aiohttp.ClientSession() as session:
            async with session.post(
                MORPHO_API_URL,
                json={"query": query, "variables": variables or {}},
                timeout=aiohttp.ClientTimeout(total=30),
            ) as resp:
                payload = await resp.json()
                if payload.get("errors"):
                    raise RuntimeError(str(payload["errors"]))
                return payload.get("data", {})

    async def discover_borrowers(self, limit: int = 500) -> list[str]:
        borrowers: set[str] = set()
        cache_path = self._cache_path()
        if cache_path.exists():
            cached = json.loads(cache_path.read_text())
            borrowers.update(cached.get("borrowers", []))

        skip = 0
        page = 100
        while len(borrowers) < limit and skip < 2000:
            try:
                data = await self._graphql(BORROWERS_QUERY, {"first": page, "skip": skip})
                items = data.get("marketPositions", {}).get("items", [])
                if not items:
                    break
                for item in items:
                    user = item.get("user", {}).get("address")
                    if user and self._is_blue_chip(item):
                        borrowers.add(Web3.to_checksum_address(user))
                skip += page
            except Exception as exc:
                logger.warning("Morpho API borrower page failed: %s", exc)
                break

        ordered = sorted(borrowers)[:limit]
        cache_path.parent.mkdir(parents=True, exist_ok=True)
        cache_path.write_text(
            json.dumps(
                {"updated_at": datetime.now(UTC).isoformat(), "borrowers": ordered},
                indent=2,
            )
        )
        return ordered

    async def fetch_watch_positions(self) -> list[dict[str, Any]]:
        """Positions with HF between 1.0 and watch threshold — prep for oracle triggers."""
        try:
            data = await self._graphql(
                WATCH_QUERY,
                {"hf": self.settings.watch_hf_threshold},
            )
            self._watch_cache = [
                p for p in data.get("marketPositions", {}).get("items", []) if self._is_blue_chip(p)
            ]
        except Exception as exc:
            logger.warning("Morpho watch query failed: %s", exc)
        return self._watch_cache

    @staticmethod
    def _is_blue_chip(position: dict[str, Any]) -> bool:
        market = position.get("market", {})
        loan_sym = market.get("loanAsset", {}).get("symbol", "")
        coll_sym = market.get("collateralAsset", {}).get("symbol", "")
        return loan_sym in BLUE_CHIP_SYMBOLS and coll_sym in BLUE_CHIP_SYMBOLS

    async def scan(self, borrowers: list[str] | None = None) -> list[LiquidationTarget]:
        targets: list[LiquidationTarget] = []
        try:
            data = await self._graphql(
                """
                query Liquidatable($first: Int!) {
                  marketPositions(
                    first: $first
                    where: { chainId_in: [%d], healthFactor_lte: 1.0 }
                    orderBy: HealthFactor
                    orderDirection: Asc
                  ) {
                    items {
                      user { address }
                      healthFactor
                      state { borrowAssets borrowAssetsUsd collateral collateralUsd }
                      market {
                        marketId lltv oracleAddress irmAddress
                        loanAsset { address symbol decimals }
                        collateralAsset { address symbol decimals }
                      }
                    }
                  }
                }
                """
                % MORPHO_CHAIN_ID,
                {"first": 100},
            )
            items = data.get("marketPositions", {}).get("items", [])
        except Exception as exc:
            logger.warning("Morpho liquidatable query failed: %s", exc)
            items = []

        for pos in items:
            if not self._is_blue_chip(pos):
                continue
            target = self._to_target(pos)
            if target is not None:
                targets.append(target)

        targets.sort(key=lambda t: (t.urgency, t.estimated_profit_usd), reverse=True)
        return targets

    def _to_target(self, pos: dict[str, Any]) -> LiquidationTarget | None:
        market = pos.get("market", {})
        state = pos.get("state", {})
        user = pos.get("user", {}).get("address")
        if not user:
            return None

        hf = float(pos.get("healthFactor") or 0)
        if hf <= 0 or hf >= self.settings.health_factor_threshold:
            return None

        loan = market.get("loanAsset", {})
        coll = market.get("collateralAsset", {})
        debt_usd = float(state.get("borrowAssetsUsd") or 0)
        if debt_usd < self.settings.min_profit_usd:
            return None

        lltv = int(market.get("lltv") or 0)
        lif = morpho_liquidation_incentive_factor(lltv)
        bonus_bps = int((lif - 1) * 10_000)

        debt_decimals = int(loan.get("decimals") or 6)
        borrow_assets = int(state.get("borrowAssets") or 0)
        debt_to_cover = borrow_assets  # Morpho allows full liquidation
        debt_human = debt_to_cover / (10**debt_decimals)

        profit = estimate_profit_usd(
            debt_human,
            bonus_bps,
            slippage_bps=self.settings.slippage_bps,
            gas_usd=0.5,
            flash_fee_bps=0,  # Morpho flash loans are free on mainnet
        )
        if profit < self.settings.min_profit_usd:
            return None

        return LiquidationTarget(
            protocol_id=self.protocol_id,
            protocol_name=self.display_name,
            user=Web3.to_checksum_address(user),
            health_factor=hf,
            total_collateral_usd=float(state.get("collateralUsd") or 0),
            total_debt_usd=debt_usd,
            collateral_asset=Web3.to_checksum_address(coll.get("address", "0x" + "0" * 40)),
            collateral_symbol=coll.get("symbol", "?"),
            debt_asset=Web3.to_checksum_address(loan.get("address", "0x" + "0" * 40)),
            debt_symbol=loan.get("symbol", "?"),
            debt_to_cover=debt_to_cover,
            debt_to_cover_human=debt_human,
            estimated_profit_usd=profit,
            swap_fee=500,
            flash_amount=debt_to_cover,
            liquidation_bonus_bps=bonus_bps,
            executable=False,
            urgency=urgency_score(hf),
            market_id=market.get("marketId", ""),
        )
