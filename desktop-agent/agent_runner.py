#!/usr/bin/env python3
"""CDP Flash Liquidation Agent — desktop runner with live dashboard."""

from __future__ import annotations

import argparse
import asyncio
import logging
import sys
from pathlib import Path

import uvicorn

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))

from agent.ai_engine import LiquidationAIEngine
from agent.cdp_wallet import CdpWalletManager
from agent.executor import FlashLiquidationExecutor
from agent.oracle_monitor import OracleMonitor
from agent.scanner import MultiProtocolScanner
from config.settings import load_settings
from ui.dashboard import app, push_log, update_state

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("agent_runner")


class FlashLiquidationAgent:
    def __init__(self, network: str | None = None, scan_only: bool = False) -> None:
        self.settings = load_settings(network)
        if scan_only:
            object.__setattr__(self.settings, "execute_enabled", False)
        self.wallet = CdpWalletManager(self.settings)
        self.scanner: MultiProtocolScanner | None = None
        self.executor: FlashLiquidationExecutor | None = None
        self.ai = LiquidationAIEngine(self.settings)
        self.oracle_monitor: OracleMonitor | None = None
        self._running = False

    async def setup(self) -> None:
        bundle = await self.wallet.initialize()
        self.scanner = MultiProtocolScanner(self.settings, bundle.w3)
        self.executor = FlashLiquidationExecutor(self.settings, self.wallet)
        self.oracle_monitor = OracleMonitor(bundle.w3)
        update_state(
            status="ready",
            network=self.settings.network,
            smart_account=bundle.smart_account.address,
            enabled_protocols=self.scanner.protocol_names,
        )
        push_log(f"Agent ready on {self.settings.network}")
        push_log(f"Protocols: {', '.join(self.scanner.protocol_names)}")
        push_log(f"Smart account: {bundle.smart_account.address}")
        if self.settings.flash_liquidator_address:
            push_log(f"FlashLiquidator (Aave): {self.settings.flash_liquidator_address}")
        else:
            push_log("FLASH_LIQUIDATOR_ADDRESS not set — Aave execution disabled")
        if self.settings.morpho_flash_liquidator_address:
            push_log(f"MorphoFlashLiquidator: {self.settings.morpho_flash_liquidator_address}")
        else:
            push_log("MORPHO_FLASH_LIQUIDATOR_ADDRESS not set — Morpho execution disabled")

    async def run_loop(self) -> None:
        assert self.scanner is not None
        assert self.executor is not None
        self._running = True
        update_state(status="scanning")

        while self._running:
            try:
                if self.oracle_monitor is not None:
                    oracle_updates = self.oracle_monitor.poll_feeds()
                    if oracle_updates:
                        push_log(f"Oracle updates: {', '.join(oracle_updates)} — rescanning")

                borrowers_by_protocol = await self.scanner.discover_borrowers()
                total_borrowers = sum(len(v) for v in borrowers_by_protocol.values())
                push_log(
                    f"Tracking {total_borrowers} borrowers ({self.scanner.borrower_stats(borrowers_by_protocol)})"
                )
                targets = await self.scanner.scan(borrowers_by_protocol)
                watch_list = await self.scanner.fetch_watch_list()
                decision = await self.ai.decide(targets)

                update_state(
                    targets=[t.to_dict() for t in targets[:25]],
                    watch_targets=[w.to_dict() for w in watch_list[:15]],
                    decision=decision.to_dict(),
                )
                from ui.dashboard import _state

                _state["scan_count"] = _state.get("scan_count", 0) + 1

                push_log(
                    f"Scan: {len(targets)} liquidatable, {len(watch_list)} watch | decision={decision.action}"
                )

                if (
                    self.settings.execute_enabled
                    and decision.action == "execute"
                    and decision.target_user
                    and decision.protocol_id in ("aave-v3", "morpho")
                ):
                    match = next(
                        (
                            t
                            for t in targets
                            if t.user.lower() == decision.target_user.lower()
                            and t.protocol_id == decision.protocol_id
                            and t.executable
                        ),
                        None,
                    )
                    if match:
                        contract_ok = (
                            (match.protocol_id == "aave-v3" and self.settings.flash_liquidator_address)
                            or (
                                match.protocol_id == "morpho"
                                and self.settings.morpho_flash_liquidator_address
                            )
                        )
                        if contract_ok:
                            push_log(f"Executing {match.protocol_name} liquidation for {match.user}")
                            result = await self.executor.execute(match)
                            update_state(last_execution=result.__dict__)
                            push_log(result.message)

            except Exception as exc:
                logger.exception("Agent loop error")
                push_log(f"Error: {exc}")

            await asyncio.sleep(self.settings.scan_interval_seconds)

    async def shutdown(self) -> None:
        self._running = False
        await self.wallet.close()
        update_state(status="stopped")


async def main() -> None:
    parser = argparse.ArgumentParser(description="CDP Flash Liquidation Desktop Agent")
    parser.add_argument("--network", choices=["base", "base-sepolia"], default=None)
    parser.add_argument("--scan-only", action="store_true", help="Disable execution even if EXECUTE_ENABLED=true")
    parser.add_argument("--port", type=int, default=None)
    args = parser.parse_args()

    settings = load_settings(args.network)
    if args.port:
        object.__setattr__(settings, "dashboard_port", args.port)

    agent = FlashLiquidationAgent(args.network, scan_only=args.scan_only)
    await agent.setup()

    config = uvicorn.Config(
        app,
        host=agent.settings.dashboard_host,
        port=agent.settings.dashboard_port,
        log_level="warning",
    )
    server = uvicorn.Server(config)

    async def run_agent() -> None:
        await agent.run_loop()

    await asyncio.gather(server.serve(), run_agent())


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        pass
