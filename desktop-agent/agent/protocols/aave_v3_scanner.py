"""Aave V3 liquidation scanner for Base / Base Sepolia."""

from __future__ import annotations

import json
import logging
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import aiohttp
from web3 import Web3
from web3.contract import Contract

from agent.models import LiquidationTarget
from agent.protocols.aave_v3_base import (
    AAVE_BASE_SUBGRAPH,
    ERC20_ABI,
    POOL_ABI,
    POOL_DATA_PROVIDER_ABI,
    get_aave_addresses,
)
from agent.protocols.base import ProtocolScanner
from config.settings import AgentSettings

logger = logging.getLogger(__name__)

HF_SCALE = 10**18
CLOSE_FACTOR = 0.5
FLASH_LOAN_PREMIUM_BPS = 5


class AaveV3Scanner(ProtocolScanner):
    protocol_id = "aave-v3"
    display_name = "Aave V3"
    executable = True

    def __init__(self, settings: AgentSettings, w3: Web3) -> None:
        super().__init__(settings, w3)
        self.addresses = get_aave_addresses(settings.network)
        self.pool: Contract = w3.eth.contract(
            address=Web3.to_checksum_address(self.addresses["pool"]),
            abi=POOL_ABI,
        )
        self.data_provider: Contract = w3.eth.contract(
            address=Web3.to_checksum_address(self.addresses["pool_data_provider"]),
            abi=POOL_DATA_PROVIDER_ABI,
        )
        self._reserve_meta: dict[str, dict[str, Any]] = {}

    def _cache_path(self) -> Path:
        return self.settings.borrower_cache_dir / f"{self.protocol_id}.json"

    async def _load_reserve_meta(self) -> None:
        if self._reserve_meta:
            return
        tokens = self.data_provider.functions.getAllReservesTokens().call()
        for symbol, token_address in tokens:
            token = Web3.to_checksum_address(token_address)
            erc20 = self.w3.eth.contract(address=token, abi=ERC20_ABI)
            try:
                decimals = erc20.functions.decimals().call()
            except Exception:
                decimals = 18
            config = self.data_provider.functions.getReserveConfigurationData(token).call()
            self._reserve_meta[token.lower()] = {
                "symbol": symbol,
                "decimals": int(decimals),
                "liquidation_bonus_bps": int(config[3]),
                "liquidation_threshold": int(config[2]),
            }

    async def discover_borrowers(self, limit: int = 500) -> list[str]:
        borrowers: set[str] = set()
        cache_path = self._cache_path()
        if cache_path.exists():
            cached = json.loads(cache_path.read_text())
            borrowers.update(cached.get("borrowers", []))

        subgraph_users = await self._fetch_subgraph_borrowers(limit=limit)
        borrowers.update(subgraph_users)

        event_users = await self._scan_recent_borrow_events(
            blocks=25_000 if not cache_path.exists() or len(borrowers) < 10 else 3_000
        )
        borrowers.update(event_users)

        ordered = sorted(borrowers)
        cache_path.parent.mkdir(parents=True, exist_ok=True)
        cache_path.write_text(
            json.dumps(
                {"updated_at": datetime.now(UTC).isoformat(), "borrowers": ordered},
                indent=2,
            )
        )
        return ordered

    async def _fetch_subgraph_borrowers(self, limit: int) -> list[str]:
        query = """
        query Borrowers($first: Int!) {
          users(first: $first, where: { borrowedReservesCount_gt: 0 }, orderBy: id) {
            id
          }
        }
        """
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    AAVE_BASE_SUBGRAPH,
                    json={"query": query, "variables": {"first": limit}},
                    timeout=aiohttp.ClientTimeout(total=20),
                ) as response:
                    if response.status != 200:
                        return []
                    payload = await response.json()
                    users = payload.get("data", {}).get("users", [])
                    return [Web3.to_checksum_address(u["id"]) for u in users if u.get("id")]
        except Exception as exc:
            logger.warning("Aave subgraph borrower fetch failed: %s", exc)
            return []

    async def _scan_recent_borrow_events(self, blocks: int = 10_000) -> list[str]:
        latest = self.w3.eth.block_number
        from_block = max(0, latest - blocks)
        borrow_topic = "0x" + self.w3.keccak(
            text="Borrow(address,address,address,uint256,uint8,uint256,uint16)"
        ).hex()

        users: set[str] = set()
        chunk = 999
        start = from_block
        while start <= latest:
            end = min(start + chunk - 1, latest)
            try:
                logs = self.w3.eth.get_logs(
                    {
                        "address": self.addresses["pool"],
                        "fromBlock": start,
                        "toBlock": end,
                        "topics": [borrow_topic],
                    }
                )
                for log in logs:
                    if len(log["topics"]) >= 3:
                        on_behalf_of = Web3.to_checksum_address(
                            "0x" + log["topics"][2].hex()[-40:]
                        )
                        users.add(on_behalf_of)
                    if log.get("data") and len(log["data"]) >= 66:
                        user = Web3.to_checksum_address("0x" + log["data"].hex()[26:66])
                        users.add(user)
            except Exception as exc:
                logger.warning("Aave borrow chunk %s-%s failed: %s", start, end, exc)
            start = end + 1

        return list(users)

    async def scan(self, borrowers: list[str] | None = None) -> list[LiquidationTarget]:
        await self._load_reserve_meta()
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
            (
                total_collateral_base,
                total_debt_base,
                _available_borrows,
                _liq_threshold,
                _ltv,
                health_factor_raw,
            ) = self.pool.functions.getUserAccountData(user).call()
        except Exception:
            return None

        if total_debt_base == 0:
            return None

        health_factor = health_factor_raw / HF_SCALE
        if health_factor >= self.settings.health_factor_threshold:
            return None

        best_pair = await self._best_liquidation_pair(user)
        if best_pair is None:
            return None

        collateral_asset, debt_asset, debt_raw, debt_decimals, bonus_bps = best_pair
        debt_to_cover = int(debt_raw * CLOSE_FACTOR)
        if debt_to_cover == 0:
            return None

        flash_fee = (debt_to_cover * FLASH_LOAN_PREMIUM_BPS) // 10_000
        flash_amount = debt_to_cover

        collateral_usd = total_collateral_base / 1e8
        debt_usd = total_debt_base / 1e8
        bonus_multiplier = 1 + (bonus_bps / 10_000)
        gross_profit_usd = (debt_to_cover / (10**debt_decimals)) * bonus_multiplier * 0.15
        flash_fee_usd = flash_fee / (10**debt_decimals)
        estimated_profit = gross_profit_usd - flash_fee_usd - 0.5

        if estimated_profit < self.settings.min_profit_usd:
            return None

        collateral_meta = self._reserve_meta.get(collateral_asset.lower(), {})
        debt_meta = self._reserve_meta.get(debt_asset.lower(), {})

        return LiquidationTarget(
            protocol_id=self.protocol_id,
            protocol_name=self.display_name,
            user=user,
            health_factor=health_factor,
            total_collateral_usd=collateral_usd,
            total_debt_usd=debt_usd,
            collateral_asset=collateral_asset,
            collateral_symbol=collateral_meta.get("symbol", "UNK"),
            debt_asset=debt_asset,
            debt_symbol=debt_meta.get("symbol", "UNK"),
            debt_to_cover=debt_to_cover,
            debt_to_cover_human=debt_to_cover / (10**debt_decimals),
            estimated_profit_usd=estimated_profit,
            swap_fee=500 if collateral_asset.lower() != debt_asset.lower() else 0,
            flash_amount=flash_amount,
            liquidation_bonus_bps=bonus_bps,
            executable=self.executable and bool(self.settings.flash_liquidator_address),
        )

    async def _best_liquidation_pair(
        self, user: str
    ) -> tuple[str, str, int, int, int] | None:
        best: tuple[str, str, int, int, int] | None = None
        best_debt = 0

        for token_addr, meta in self._reserve_meta.items():
            asset = Web3.to_checksum_address(token_addr)
            try:
                (
                    a_token_balance,
                    stable_debt,
                    variable_debt,
                    *_rest,
                    usage_as_collateral,
                ) = self.data_provider.functions.getUserReserveData(asset, user).call()
            except Exception:
                continue

            total_debt = stable_debt + variable_debt
            if total_debt > best_debt:
                best_debt = total_debt
                best = (asset, asset, total_debt, meta["decimals"], meta["liquidation_bonus_bps"])

            if usage_as_collateral and a_token_balance > 0 and best is not None:
                debt_asset = best[1]
                if debt_asset != asset:
                    return (asset, debt_asset, best[2], best[3], best[4])

        if best is None:
            return None

        collateral_asset = best[0]
        for token_addr, meta in self._reserve_meta.items():
            asset = Web3.to_checksum_address(token_addr)
            try:
                (a_balance, stable_debt, variable_debt, *_rest, usage) = (
                    self.data_provider.functions.getUserReserveData(asset, user).call()
                )
            except Exception:
                continue
            if usage and a_balance > 0 and (stable_debt + variable_debt) == 0:
                collateral_asset = asset
                break

        return (collateral_asset, best[1], best[2], best[3], best[4])
