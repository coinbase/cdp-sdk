"""Compound III (Comet) liquidation scanner on Base."""

from __future__ import annotations

import json
import logging
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from web3 import Web3
from web3.contract import Contract

from agent.models import LiquidationTarget
from agent.protocols.base import ProtocolScanner
from agent.protocols.compound_v3_base import COMET_ABI, COMPOUND_V3_BASE, ERC20_ABI
from config.settings import AgentSettings

logger = logging.getLogger(__name__)

FACTOR_SCALE = 10**18
BASE_DECIMALS = 6


class CompoundV3Scanner(ProtocolScanner):
    protocol_id = "compound-v3"
    display_name = "Compound V3"
    executable = False

    def __init__(self, settings: AgentSettings, w3: Web3) -> None:
        super().__init__(settings, w3)
        if settings.network != "base":
            raise ValueError("Compound V3 scanner only supports Base mainnet")
        self.comet: Contract = w3.eth.contract(
            address=Web3.to_checksum_address(COMPOUND_V3_BASE["cUSDCv3"]),
            abi=COMET_ABI,
        )
        self._collateral_assets: list[dict[str, Any]] = []

    def _cache_path(self) -> Path:
        return self.settings.borrower_cache_dir / f"{self.protocol_id}.json"

    async def _load_collateral_assets(self) -> None:
        if self._collateral_assets:
            return
        for symbol, asset in COMPOUND_V3_BASE["collateral_assets"].items():
            addr = Web3.to_checksum_address(asset)
            try:
                info = self.comet.functions.getAssetInfoByAddress(addr).call()
                erc20 = self.w3.eth.contract(address=addr, abi=ERC20_ABI)
                decimals = erc20.functions.decimals().call()
                self._collateral_assets.append(
                    {
                        "symbol": symbol,
                        "asset": addr,
                        "decimals": int(decimals),
                        "liquidation_factor": int(info[5]),
                        "liquidate_collateral_factor": int(info[4]),
                    }
                )
            except Exception:
                # Fallback to static list if getAssetInfoByAddress unavailable
                self._collateral_assets.append(
                    {
                        "symbol": symbol,
                        "asset": addr,
                        "decimals": 18 if symbol != "cbBTC" else 8,
                        "liquidation_factor": int(0.07 * FACTOR_SCALE),
                        "liquidate_collateral_factor": int(0.85 * FACTOR_SCALE),
                    }
                )

    async def discover_borrowers(self, limit: int = 500) -> list[str]:
        borrowers: set[str] = set()
        cache_path = self._cache_path()
        if cache_path.exists():
            cached = json.loads(cache_path.read_text())
            borrowers.update(cached.get("borrowers", []))

        blocks = 30_000 if len(borrowers) < 10 else 3_000
        event_users = await self._scan_withdraw_events(blocks=blocks)
        borrowers.update(event_users)

        ordered = sorted(borrowers)[:limit]
        cache_path.parent.mkdir(parents=True, exist_ok=True)
        cache_path.write_text(
            json.dumps(
                {"updated_at": datetime.now(UTC).isoformat(), "borrowers": ordered},
                indent=2,
            )
        )
        return ordered

    async def _scan_withdraw_events(self, blocks: int = 100_000) -> list[str]:
        """Withdraw base asset from Comet = borrow."""
        latest = self.w3.eth.block_number
        from_block = max(0, latest - blocks)
        withdraw_topic = "0x" + self.w3.keccak(
            text="Withdraw(address,address,uint256)"
        ).hex()

        comet_addr = Web3.to_checksum_address(COMPOUND_V3_BASE["cUSDCv3"])
        users: set[str] = set()
        chunk = 999
        start = from_block
        while start <= latest:
            end = min(start + chunk - 1, latest)
            try:
                logs = self.w3.eth.get_logs(
                    {
                        "address": comet_addr,
                        "fromBlock": start,
                        "toBlock": end,
                        "topics": [withdraw_topic],
                    }
                )
                for log in logs:
                    if len(log["topics"]) >= 2:
                        src = Web3.to_checksum_address("0x" + log["topics"][1].hex()[-40:])
                        users.add(src)
            except Exception as exc:
                logger.warning("Compound withdraw chunk %s-%s failed: %s", start, end, exc)
            start = end + 1
        return list(users)

    async def scan(self, borrowers: list[str] | None = None) -> list[LiquidationTarget]:
        await self._load_collateral_assets()
        if borrowers is None:
            borrowers = await self.discover_borrowers()

        targets: list[LiquidationTarget] = []
        for user in borrowers:
            target = await self._evaluate_user(user)
            if target is not None:
                targets.append(target)

        targets.sort(key=lambda t: t.estimated_profit_usd, reverse=True)
        return targets

    async def _evaluate_user(self, user: str) -> LiquidationTarget | None:
        try:
            is_liquidatable = self.comet.functions.isLiquidatable(user).call()
            borrow_balance = self.comet.functions.borrowBalanceOf(user).call()
        except Exception:
            return None

        if not is_liquidatable or borrow_balance == 0:
            return None

        collateral = await self._best_collateral(user)
        if collateral is None:
            return None

        debt_usd = borrow_balance / (10**BASE_DECIMALS)
        # Comet absorbs full position; estimate ~50% close for profit calc
        debt_to_cover = int(borrow_balance * 0.5)
        liq_factor_bps = int(collateral["liquidation_factor"] / FACTOR_SCALE * 10_000)
        bonus_bps = max(liq_factor_bps, 500)

        gross_profit_usd = (debt_to_cover / (10**BASE_DECIMALS)) * (1 + bonus_bps / 10_000) * 0.1
        estimated_profit = gross_profit_usd - 0.5

        if estimated_profit < self.settings.min_profit_usd:
            return None

        # Pseudo health factor for display
        health_factor = 0.95

        return LiquidationTarget(
            protocol_id=self.protocol_id,
            protocol_name=self.display_name,
            user=user,
            health_factor=health_factor,
            total_collateral_usd=debt_usd * 1.1,
            total_debt_usd=debt_usd,
            collateral_asset=collateral["asset"],
            collateral_symbol=collateral["symbol"],
            debt_asset=COMPOUND_V3_BASE["base_asset"],
            debt_symbol="USDC",
            debt_to_cover=debt_to_cover,
            debt_to_cover_human=debt_to_cover / (10**BASE_DECIMALS),
            estimated_profit_usd=estimated_profit,
            swap_fee=500,
            flash_amount=debt_to_cover,
            liquidation_bonus_bps=bonus_bps,
            executable=False,
        )

    async def _best_collateral(self, user: str) -> dict[str, Any] | None:
        best: dict[str, Any] | None = None
        best_balance = 0
        for asset_info in self._collateral_assets:
            try:
                balance = self.comet.functions.collateralBalanceOf(
                    user, asset_info["asset"]
                ).call()
            except Exception:
                continue
            if balance > best_balance:
                best_balance = balance
                best = asset_info
        return best
