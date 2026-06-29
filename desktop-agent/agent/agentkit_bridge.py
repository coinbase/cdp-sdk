"""Optional Coinbase AgentKit wallet bridge for extended agent tooling."""

from __future__ import annotations

import logging

from config.settings import AgentSettings

logger = logging.getLogger(__name__)


def build_agentkit_wallet(settings: AgentSettings):
    """Create AgentKit CdpSmartWalletProvider when coinbase-agentkit is installed."""
    try:
        from coinbase_agentkit import (
            AgentKit,
            AgentKitConfig,
            CdpSmartWalletProvider,
            CdpSmartWalletProviderConfig,
        )
    except ImportError as exc:
        raise ImportError(
            "coinbase-agentkit is required for AgentKit integration. "
            "Install via requirements.txt"
        ) from exc

    network_id = "base-mainnet" if settings.network == "base" else "base-sepolia"

    wallet_provider = CdpSmartWalletProvider(
        CdpSmartWalletProviderConfig(
            api_key_id=settings.cdp_api_key_id,
            api_key_secret=settings.cdp_api_key_secret,
            wallet_secret=settings.cdp_wallet_secret,
            network_id=network_id,
            owner=settings.owner_private_key,
            paymaster_url=settings.paymaster_rpc_url,
        )
    )

    agent_kit = AgentKit(AgentKitConfig(wallet_provider=wallet_provider))
    logger.info("AgentKit initialized on %s", network_id)
    return agent_kit, wallet_provider
