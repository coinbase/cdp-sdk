"""Network configuration for EVM chains."""

# Network to chain ID mapping
NETWORK_TO_CHAIN_ID: dict[str, int] = {
    # Ethereum networks
    "ethereum": 1,
    "ethereum-sepolia": 11155111,
    "ethereum-hoodi": 17000,  # Holesky
    # Base networks
    "base": 8453,
    "base-sepolia": 84532,
    # Polygon networks
    "polygon": 137,
    "polygon-mumbai": 80001,
    # Arbitrum networks
    "arbitrum": 42161,
    "arbitrum-sepolia": 421614,
    # Optimism networks
    "optimism": 10,
    "optimism-sepolia": 11155420,
}

# Chain ID to network mapping (reverse lookup)
CHAIN_ID_TO_NETWORK: dict[int, str] = {v: k for k, v in NETWORK_TO_CHAIN_ID.items()}

# Default public RPC URLs for known networks, sourced from viem chain definitions:
# https://github.com/wevm/viem/tree/main/src/chains/definitions
NETWORK_TO_RPC_URL: dict[str, str] = {
    # Ethereum networks
    "ethereum": "https://eth.merkle.io",
    "ethereum-sepolia": "https://11155111.rpc.thirdweb.com",
    # Base networks
    "base": "https://mainnet.base.org",
    "base-sepolia": "https://sepolia.base.org",
    # Polygon networks
    "polygon": "https://polygon.drpc.org",
    "polygon-mumbai": "https://80001.rpc.thirdweb.com",
    # Arbitrum networks
    "arbitrum": "https://arb1.arbitrum.io/rpc",
    "arbitrum-sepolia": "https://sepolia-rollup.arbitrum.io/rpc",
    # Optimism networks
    "optimism": "https://mainnet.optimism.io",
    "optimism-sepolia": "https://sepolia.optimism.io",
}


def get_chain_id(network: str) -> int:
    """Get chain ID for a network.

    Args:
        network: Network name (e.g., "base", "ethereum-sepolia")

    Returns:
        Chain ID for the network

    Raises:
        ValueError: If network is not supported

    """
    chain_id = NETWORK_TO_CHAIN_ID.get(network)
    if chain_id is None:
        raise ValueError(f"Unsupported network: {network}")
    return chain_id


def get_network_name(chain_id: int) -> str | None:
    """Get network name for a chain ID.

    Args:
        chain_id: EVM chain ID

    Returns:
        Network name if found, None otherwise

    """
    return CHAIN_ID_TO_NETWORK.get(chain_id)


def is_supported_network(network: str) -> bool:
    """Check if a network is supported.

    Args:
        network: Network name to check

    Returns:
        True if network is supported, False otherwise

    """
    return network in NETWORK_TO_CHAIN_ID


def get_supported_networks() -> list[str]:
    """Get list of all supported networks.

    Returns:
        List of supported network names

    """
    return list(NETWORK_TO_CHAIN_ID.keys())
