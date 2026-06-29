"""Multi-protocol liquidation scanner aggregator."""

from __future__ import annotations

import asyncio
import logging

from web3 import Web3

from agent.models import LiquidationTarget
from agent.protocols.aave_v3_scanner import AaveV3Scanner
from agent.protocols.base import ProtocolScanner
from agent.protocols.registry import build_scanners
from config.settings import AgentSettings

logger = logging.getLogger(__name__)

# Backward compatibility alias
AaveLiquidationScanner = AaveV3Scanner


class MultiProtocolScanner:
    """Fan-out scanning across enabled Base lending protocols."""

    def __init__(self, settings: AgentSettings, w3: Web3) -> None:
        self.settings = settings
        self.w3 = w3
        self.scanners: list[ProtocolScanner] = build_scanners(settings, w3)
        if not self.scanners:
            raise RuntimeError("No protocol scanners enabled. Set AGENT_PROTOCOLS.")

    @property
    def protocol_names(self) -> list[str]:
        return [f"{s.display_name} ({s.protocol_id})" for s in self.scanners]

    async def discover_borrowers(self, limit: int = 500) -> dict[str, list[str]]:
        """Discover borrowers per protocol in parallel."""
        results = await asyncio.gather(
            *[scanner.discover_borrowers(limit=limit) for scanner in self.scanners],
            return_exceptions=True,
        )
        by_protocol: dict[str, list[str]] = {}
        for scanner, result in zip(self.scanners, results, strict=True):
            if isinstance(result, Exception):
                logger.warning("%s borrower discovery failed: %s", scanner.protocol_id, result)
                by_protocol[scanner.protocol_id] = []
            else:
                by_protocol[scanner.protocol_id] = result
        return by_protocol

    async def scan(
        self, borrowers_by_protocol: dict[str, list[str]] | None = None
    ) -> list[LiquidationTarget]:
        """Scan all protocols and merge targets sorted by profit."""

        async def _scan_one(scanner: ProtocolScanner) -> list[LiquidationTarget]:
            borrowers = None
            if borrowers_by_protocol is not None:
                borrowers = borrowers_by_protocol.get(scanner.protocol_id)
            try:
                return await scanner.scan(borrowers)
            except Exception as exc:
                logger.warning("%s scan failed: %s", scanner.protocol_id, exc)
                return []

        results = await asyncio.gather(*[_scan_one(s) for s in self.scanners])
        targets: list[LiquidationTarget] = []
        for batch in results:
            targets.extend(batch)
        targets.sort(key=lambda t: t.estimated_profit_usd, reverse=True)
        return targets

    def borrower_stats(self, by_protocol: dict[str, list[str]]) -> str:
        parts = [f"{pid}:{len(addrs)}" for pid, addrs in by_protocol.items()]
        return " | ".join(parts)


__all__ = ["LiquidationTarget", "MultiProtocolScanner", "AaveLiquidationScanner"]
