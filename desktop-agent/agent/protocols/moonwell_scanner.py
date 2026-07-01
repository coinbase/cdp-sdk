"""Moonwell liquidation scanner (Compound V2 fork on Base)."""

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
from agent.protocols.moonwell_base import (
    COMPTROLLER_ABI,
    ERC20_ABI,
    MOONWELL_BASE,
    MTOKEN_ABI,
)
from config.settings import AgentSettings

logger = logging.getLogger(__name__)

MANTISSA = 10**18


class MoonwellScanner(ProtocolScanner):
    protocol_id = "moonwell"
    display_name = "Moonwell"
    executable = False

    def __init__(self, settings: AgentSettings, w3: Web3) -> None:
        super().__init__(settings, w3)
        if settings.network != "base":
            raise ValueError("Moonwell scanner only supports Base mainnet")
        self.comptroller: Contract = w3.eth.contract(
            address=Web3.to_checksum_address(MOONWELL_BASE["comptroller"]),
            abi=COMPTROLLER_ABI,
        )
        self._markets: list[dict[str, Any]] = []
        self._close_factor: float = 0.5
        self._liq_incentive_bps: int = 800

    def _cache_path(self) -> Path:
        return self.settings.borrower_cache_dir / f"{self.protocol_id}.json"

    async def _load_markets(self) -> None:
        if self._markets:
            return
        try:
            self._close_factor = self.comptroller.functions.closeFactorMantissa().call() / MANTISSA
            incentive = self.comptroller.functions.liquidationIncentiveMantissa().call()
            self._liq_incentive_bps = int((incentive / MANTISSA - 1) * 10_000)
        except Exception:
            pass

        market_addrs = list(MOONWELL_BASE["markets"].values())
        try:
            on_chain = self.comptroller.functions.getAllMarkets().call()
            market_addrs = list({Web3.to_checksum_address(a) for a in on_chain + market_addrs})
        except Exception:
            market_addrs = [Web3.to_checksum_address(a) for a in market_addrs]

        for mtoken_addr in market_addrs:
            mtoken = self.w3.eth.contract(address=mtoken_addr, abi=MTOKEN_ABI)
            try:
                underlying = mtoken.functions.underlying().call()
                symbol = mtoken.functions.symbol().call()
                erc20 = self.w3.eth.contract(
                    address=Web3.to_checksum_address(underlying), abi=ERC20_ABI
                )
                decimals = erc20.functions.decimals().call()
                underlying_symbol = erc20.functions.symbol().call()
            except Exception:
                continue
            self._markets.append(
                {
                    "mtoken": mtoken_addr,
                    "underlying": Web3.to_checksum_address(underlying),
                    "symbol": underlying_symbol,
                    "mtoken_symbol": symbol,
                    "decimals": int(decimals),
                    "contract": mtoken,
                }
            )

    async def discover_borrowers(self, limit: int = 500) -> list[str]:
        await self._load_markets()
        borrowers: set[str] = set()
        cache_path = self._cache_path()
        if cache_path.exists():
            cached = json.loads(cache_path.read_text())
            borrowers.update(cached.get("borrowers", []))

        # Incremental: scan recent blocks; full backfill only when cache is empty
        blocks = 25_000 if len(borrowers) < 10 else 3_000
        event_users = await self._scan_borrow_events(blocks=blocks)
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

    async def _scan_borrow_events(self, blocks: int = 50_000) -> list[str]:
        latest = self.w3.eth.block_number
        from_block = max(0, latest - blocks)
        borrow_topic = "0x" + self.w3.keccak(
            text="Borrow(address,uint256,uint256,uint256)"
        ).hex()

        users: set[str] = set()
        chunk = 999
        priority = {
            Web3.to_checksum_address(MOONWELL_BASE["markets"]["mUSDC"]),
            Web3.to_checksum_address(MOONWELL_BASE["markets"]["mWETH"]),
            Web3.to_checksum_address(MOONWELL_BASE["markets"]["mcbETH"]),
        }
        scan_markets = [m for m in self._markets if m["mtoken"] in priority] or self._markets[:3]
        for market in scan_markets:
            start = from_block
            while start <= latest:
                end = min(start + chunk - 1, latest)
                try:
                    logs = self.w3.eth.get_logs(
                        {
                            "address": market["mtoken"],
                            "fromBlock": start,
                            "toBlock": end,
                            "topics": [borrow_topic],
                        }
                    )
                    for log in logs:
                        borrower: str | None = None
                        if len(log.get("topics", [])) >= 2:
                            borrower = Web3.to_checksum_address(
                                "0x" + log["topics"][1].hex()[-40:]
                            )
                        elif log.get("data") and len(log["data"]) >= 66:
                            borrower = Web3.to_checksum_address(
                                "0x" + log["data"].hex()[26:66]
                            )
                        if borrower:
                            users.add(borrower)
                except Exception as exc:
                    logger.warning("Moonwell borrow chunk %s-%s failed: %s", start, end, exc)
                start = end + 1
        return list(users)

    async def scan(self, borrowers: list[str] | None = None) -> list[LiquidationTarget]:
        await self._load_markets()
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
            _err, liquidity, shortfall = self.comptroller.functions.getAccountLiquidity(
                user
            ).call()
        except Exception:
            return None

        if shortfall == 0:
            return None

        liquidity_usd = liquidity / MANTISSA
        shortfall_usd = shortfall / MANTISSA
        total_debt_usd = liquidity_usd + shortfall_usd
        health_factor = liquidity_usd / total_debt_usd if total_debt_usd > 0 else 0.0

        if health_factor >= self.settings.health_factor_threshold:
            return None

        pair = await self._best_liquidation_pair(user)
        if pair is None:
            return None

        borrow_market, collateral_market, debt_raw = pair
        debt_decimals = borrow_market["decimals"]
        debt_to_cover = int(debt_raw * self._close_factor)
        if debt_to_cover == 0:
            return None

        bonus_bps = self._liq_incentive_bps
        gross_profit_usd = (debt_to_cover / (10**debt_decimals)) * (1 + bonus_bps / 10_000) * 0.12
        estimated_profit = gross_profit_usd - 0.5

        if estimated_profit < self.settings.min_profit_usd:
            return None

        return LiquidationTarget(
            protocol_id=self.protocol_id,
            protocol_name=self.display_name,
            user=user,
            health_factor=health_factor,
            total_collateral_usd=liquidity_usd + shortfall_usd,
            total_debt_usd=total_debt_usd,
            collateral_asset=collateral_market["underlying"],
            collateral_symbol=collateral_market["symbol"],
            debt_asset=borrow_market["underlying"],
            debt_symbol=borrow_market["symbol"],
            debt_to_cover=debt_to_cover,
            debt_to_cover_human=debt_to_cover / (10**debt_decimals),
            estimated_profit_usd=estimated_profit,
            swap_fee=500,
            flash_amount=debt_to_cover,
            liquidation_bonus_bps=bonus_bps,
            executable=False,
        )

    async def _best_liquidation_pair(
        self, user: str
    ) -> tuple[dict[str, Any], dict[str, Any], int] | None:
        best_borrow: dict[str, Any] | None = None
        best_debt = 0
        best_collateral: dict[str, Any] | None = None
        best_collateral_balance = 0

        for market in self._markets:
            mtoken = market["contract"]
            try:
                borrow = mtoken.functions.borrowBalanceStored(user).call()
                mtoken_balance = mtoken.functions.balanceOf(user).call()
                exchange_rate = mtoken.functions.exchangeRateStored().call()
                underlying_collateral = (mtoken_balance * exchange_rate) // MANTISSA
                is_member = self.comptroller.functions.checkMembership(
                    user, market["mtoken"]
                ).call()
            except Exception:
                continue

            if borrow > best_debt:
                best_debt = borrow
                best_borrow = market

            if is_member and underlying_collateral > best_collateral_balance:
                best_collateral_balance = underlying_collateral
                best_collateral = market

        if best_borrow is None or best_collateral is None or best_debt == 0:
            return None
        return (best_borrow, best_collateral, best_debt)
