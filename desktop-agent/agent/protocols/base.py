"""Protocol scanner interface for multi-protocol liquidation monitoring."""

from __future__ import annotations

from abc import ABC, abstractmethod

from agent.models import LiquidationTarget
from config.settings import AgentSettings
from web3 import Web3


class ProtocolScanner(ABC):
    """Scan a lending protocol for liquidatable positions."""

    protocol_id: str
    display_name: str
    executable: bool

    def __init__(self, settings: AgentSettings, w3: Web3) -> None:
        self.settings = settings
        self.w3 = w3

    @abstractmethod
    async def discover_borrowers(self, limit: int = 500) -> list[str]:
        """Return borrower addresses with open debt."""

    @abstractmethod
    async def scan(self, borrowers: list[str] | None = None) -> list[LiquidationTarget]:
        """Evaluate borrowers and return profitable liquidation targets."""
