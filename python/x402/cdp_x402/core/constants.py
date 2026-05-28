"""
CDP facilitator constants.
"""

CDP_FACILITATOR_URL = "https://api.cdp.coinbase.com/platform/v2/x402"

# Base URL for the CDP API — used by the generated openapi client, which appends
# paths like /v2/x402/discovery/... itself.
CDP_API_BASE_URL = "https://api.cdp.coinbase.com/platform"

SDK_SOURCE = "cdp-x402"
SDK_VERSION = "0.0.1"
SDK_LANGUAGE = "python"

# Correlation-Context header value identifying every request as originating
# from the CDP x402 SDK. Attached to all Facilitator and Bazaar requests.
SDK_CORRELATION_CONTEXT = (
    f"sdkLanguage={SDK_LANGUAGE},source={SDK_SOURCE},sourceVersion={SDK_VERSION}"
)

CDP_API_HOST = "api.cdp.coinbase.com"

FACILITATOR_PATHS = {
    "verify": "/verify",
    "settle": "/settle",
    "supported": "/supported",
}

# CAIP-2 network identifiers for CDP-supported chains.
BASE_MAINNET_CAIP2 = "eip155:8453"
BASE_SEPOLIA_CAIP2 = "eip155:84532"
POLYGON_CAIP2 = "eip155:137"
ARBITRUM_CAIP2 = "eip155:42161"
WORLD_CAIP2 = "eip155:480"
WORLD_SEPOLIA_CAIP2 = "eip155:4801"
SOLANA_MAINNET_CAIP2 = "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp"
SOLANA_DEVNET_CAIP2 = "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1"

# Default networks supported by the CDP facilitator
CDP_DEFAULT_NETWORKS = [
    BASE_MAINNET_CAIP2,
    BASE_SEPOLIA_CAIP2,
    POLYGON_CAIP2,
    ARBITRUM_CAIP2,
    WORLD_CAIP2,
    WORLD_SEPOLIA_CAIP2,
    SOLANA_MAINNET_CAIP2,
    SOLANA_DEVNET_CAIP2,
]

# Per-network USDC contract / mint addresses, keyed by CAIP-2 network identifier.
USDC_ADDRESS_BASE_MAINNET = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
USDC_ADDRESS_BASE_SEPOLIA = "0x036CbD53842c5426634e7929541eC2318f3dCF7e"
USDC_ADDRESS_POLYGON = "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359"
USDC_ADDRESS_ARBITRUM = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831"
USDC_ADDRESS_WORLD = "0x79A02482A880bCE3F13e09Da970dC34db4CD24d1"
USDC_ADDRESS_WORLD_SEPOLIA = "0x66145f38cBAC35Ca6F1Dfb4914dF98F1614aeA88"
USDC_ADDRESS_SOLANA_MAINNET = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
USDC_ADDRESS_SOLANA_DEVNET = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"

# Public JSON-RPC endpoints for CDP-supported EVM networks, keyed by CAIP-2 identifier.
# These are free-tier public RPCs. For production workloads consider supplying
# a dedicated RPC URL (e.g. Alchemy, Infura, or a CDP-authenticated endpoint).
CDP_EVM_RPC_URLS: dict[str, str] = {
    BASE_MAINNET_CAIP2: "https://mainnet.base.org",
    BASE_SEPOLIA_CAIP2: "https://sepolia.base.org",
    POLYGON_CAIP2: "https://polygon-bor-rpc.publicnode.com",
    ARBITRUM_CAIP2: "https://arb1.arbitrum.io/rpc",
    WORLD_CAIP2: "https://worldchain-mainnet.g.alchemy.com/public",
    WORLD_SEPOLIA_CAIP2: "https://worldchain-sepolia.g.alchemy.com/public",
}

# Mapping from each CDP-supported CAIP-2 network identifier to the canonical
# USDC contract address (EVM) or mint address (Solana).
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
