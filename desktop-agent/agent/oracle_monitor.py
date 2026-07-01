"""Chainlink oracle update monitor — liquidations cluster at oracle price updates."""

from __future__ import annotations

import logging
from dataclasses import dataclass

from web3 import Web3

logger = logging.getLogger(__name__)

BASE_FEEDS: dict[str, str] = {
    "ETH/USD": "0x71041dDDaD3595F374CEB9fD196Fa8e2795E5b0C",
    "BTC/USD": "0x64c911996D3C6ac71F9E1b0F8BC32d2d47d4a1C5",
    "USDC/USD": "0x7e86009818bbEa3085006d0996aFFac6deDa3dF3",
}

AGGREGATOR_ABI = [
    {
        "inputs": [],
        "name": "latestRoundData",
        "outputs": [
            {"internalType": "uint80", "name": "roundId", "type": "uint80"},
            {"internalType": "int256", "name": "answer", "type": "int256"},
            {"internalType": "uint256", "name": "startedAt", "type": "uint256"},
            {"internalType": "uint256", "name": "updatedAt", "type": "uint256"},
            {"internalType": "uint80", "name": "answeredInRound", "type": "uint80"},
        ],
        "stateMutability": "view",
        "type": "function",
    },
]


@dataclass
class OracleSnapshot:
    feed: str
    price: float
    updated_at: int
    round_id: int


class OracleMonitor:
    """Track Chainlink feed updates to anticipate liquidation cascades."""

    def __init__(self, w3: Web3) -> None:
        self.w3 = w3
        self._last_rounds: dict[str, int] = {}

    def poll_feeds(self) -> list[str]:
        """Return feed names that updated since last poll."""
        updated: list[str] = []
        for name, addr in BASE_FEEDS.items():
            try:
                feed = self.w3.eth.contract(
                    address=Web3.to_checksum_address(addr), abi=AGGREGATOR_ABI
                )
                round_id, answer, _started, _updated_at, _answered = (
                    feed.functions.latestRoundData().call()
                )
                prev = self._last_rounds.get(name)
                if prev is not None and round_id > prev:
                    updated.append(name)
                    logger.info("Oracle update: %s answer=%s round=%s", name, answer, round_id)
                self._last_rounds[name] = int(round_id)
            except Exception as exc:
                logger.debug("Feed poll %s failed: %s", name, exc)
        return updated
