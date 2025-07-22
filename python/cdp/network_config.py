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
