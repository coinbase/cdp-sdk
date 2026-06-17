"""Canonical network and asset registry for the CDP SDK.

Single source of truth for CAIP-2 identifiers, USDC contract/mint addresses,
EVM RPC URLs, and chain ID → CDP network name mappings used across cdp-sdk
and cdp.x402.
"""

# ---------------------------------------------------------------------------
# CAIP-2 network identifiers
# ---------------------------------------------------------------------------

BASE_MAINNET_CAIP2 = "eip155:8453"
"""CAIP-2 identifier for Base mainnet."""

BASE_SEPOLIA_CAIP2 = "eip155:84532"
"""CAIP-2 identifier for Base Sepolia testnet."""

POLYGON_CAIP2 = "eip155:137"
"""CAIP-2 identifier for Polygon mainnet."""

ARBITRUM_CAIP2 = "eip155:42161"
"""CAIP-2 identifier for Arbitrum One mainnet."""

WORLD_CAIP2 = "eip155:480"
"""CAIP-2 identifier for World Chain mainnet."""

WORLD_SEPOLIA_CAIP2 = "eip155:4801"
"""CAIP-2 identifier for World Chain Sepolia testnet."""

SOLANA_MAINNET_CAIP2 = "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp"
"""CAIP-2 identifier for Solana mainnet."""

SOLANA_DEVNET_CAIP2 = "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1"
"""CAIP-2 identifier for Solana devnet."""

# ---------------------------------------------------------------------------
# Default networks supported by the CDP facilitator
# ---------------------------------------------------------------------------

CDP_DEFAULT_NETWORKS: list[str] = [
    BASE_MAINNET_CAIP2,
    BASE_SEPOLIA_CAIP2,
    POLYGON_CAIP2,
    ARBITRUM_CAIP2,
    WORLD_CAIP2,
    WORLD_SEPOLIA_CAIP2,
    SOLANA_MAINNET_CAIP2,
    SOLANA_DEVNET_CAIP2,
]
"""All CDP facilitator-supported networks."""

# ---------------------------------------------------------------------------
# USDC contract / mint addresses, keyed by CAIP-2 network identifier
# ---------------------------------------------------------------------------

USDC_ADDRESS_BASE_MAINNET = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
USDC_ADDRESS_BASE_SEPOLIA = "0x036CbD53842c5426634e7929541eC2318f3dCF7e"
USDC_ADDRESS_POLYGON = "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359"
USDC_ADDRESS_ARBITRUM = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831"
USDC_ADDRESS_WORLD = "0x79A02482A880bCE3F13e09Da970dC34db4CD24d1"
USDC_ADDRESS_WORLD_SEPOLIA = "0x66145f38cBAC35Ca6F1Dfb4914dF98F1614aeA88"
USDC_ADDRESS_SOLANA_MAINNET = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
USDC_ADDRESS_SOLANA_DEVNET = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"

CDP_USDC_ADDRESSES: dict[str, str] = {
    BASE_MAINNET_CAIP2: USDC_ADDRESS_BASE_MAINNET,
    BASE_SEPOLIA_CAIP2: USDC_ADDRESS_BASE_SEPOLIA,
    POLYGON_CAIP2: USDC_ADDRESS_POLYGON,
    ARBITRUM_CAIP2: USDC_ADDRESS_ARBITRUM,
    WORLD_CAIP2: USDC_ADDRESS_WORLD,
    WORLD_SEPOLIA_CAIP2: USDC_ADDRESS_WORLD_SEPOLIA,
    SOLANA_MAINNET_CAIP2: USDC_ADDRESS_SOLANA_MAINNET,
    SOLANA_DEVNET_CAIP2: USDC_ADDRESS_SOLANA_DEVNET,
}
"""Mapping from CAIP-2 network identifier to USDC contract (EVM) or mint (Solana) address."""

# ---------------------------------------------------------------------------
# Public JSON-RPC endpoints for CDP-supported EVM networks
# ---------------------------------------------------------------------------

CDP_EVM_RPC_URLS: dict[str, str] = {
    BASE_MAINNET_CAIP2: "https://mainnet.base.org",
    BASE_SEPOLIA_CAIP2: "https://sepolia.base.org",
    POLYGON_CAIP2: "https://polygon-bor-rpc.publicnode.com",
    ARBITRUM_CAIP2: "https://arb1.arbitrum.io/rpc",
    WORLD_CAIP2: "https://worldchain-mainnet.g.alchemy.com/public",
    WORLD_SEPOLIA_CAIP2: "https://worldchain-sepolia.g.alchemy.com/public",
}
"""Free-tier public JSON-RPC endpoints, keyed by CAIP-2 network identifier."""

# ---------------------------------------------------------------------------
# Chain ID → CDP network name mapping (for EIP-712 domain resolution)
# ---------------------------------------------------------------------------

CHAIN_ID_TO_CDP_NETWORK: dict[int, str] = {
    8453: "base",
    84532: "base-sepolia",
    42161: "arbitrum",
    10: "optimism",
    7777777: "zora",
    137: "polygon",
    56: "bnb",
    43114: "avalanche",
    11155111: "ethereum-sepolia",
}
"""Maps EIP-155 chain IDs to CDP SDK network names for typed-data signing."""

__all__ = [
    "BASE_MAINNET_CAIP2",
    "BASE_SEPOLIA_CAIP2",
    "POLYGON_CAIP2",
    "ARBITRUM_CAIP2",
    "WORLD_CAIP2",
    "WORLD_SEPOLIA_CAIP2",
    "SOLANA_MAINNET_CAIP2",
    "SOLANA_DEVNET_CAIP2",
    "CDP_DEFAULT_NETWORKS",
    "USDC_ADDRESS_BASE_MAINNET",
    "USDC_ADDRESS_BASE_SEPOLIA",
    "USDC_ADDRESS_POLYGON",
    "USDC_ADDRESS_ARBITRUM",
    "USDC_ADDRESS_WORLD",
    "USDC_ADDRESS_WORLD_SEPOLIA",
    "USDC_ADDRESS_SOLANA_MAINNET",
    "USDC_ADDRESS_SOLANA_DEVNET",
    "CDP_USDC_ADDRESSES",
    "CDP_EVM_RPC_URLS",
    "CHAIN_ID_TO_CDP_NETWORK",
]
