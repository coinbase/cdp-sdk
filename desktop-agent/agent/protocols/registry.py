"""Protocol scanner registry."""

from __future__ import annotations

from web3 import Web3

from agent.protocols.aave_v3_scanner import AaveV3Scanner
from agent.protocols.base import ProtocolScanner
from agent.protocols.compound_v3_scanner import CompoundV3Scanner
from agent.protocols.moonwell_scanner import MoonwellScanner
from agent.protocols.morpho_scanner import MorphoScanner
from config.settings import AgentSettings

SCANNER_REGISTRY: dict[str, type[ProtocolScanner]] = {
    "aave-v3": AaveV3Scanner,
    "moonwell": MoonwellScanner,
    "compound-v3": CompoundV3Scanner,
    "morpho": MorphoScanner,
}

DEFAULT_PROTOCOLS = ("aave-v3", "moonwell", "compound-v3", "morpho")


def build_scanners(settings: AgentSettings, w3: Web3) -> list[ProtocolScanner]:
    """Instantiate enabled protocol scanners for the current network."""
    scanners: list[ProtocolScanner] = []
    for protocol_id in settings.enabled_protocols:
        cls = SCANNER_REGISTRY.get(protocol_id)
        if cls is None:
            continue
        try:
            scanners.append(cls(settings, w3))
        except ValueError as exc:
            # Protocol not available on this network
            continue
    return scanners
