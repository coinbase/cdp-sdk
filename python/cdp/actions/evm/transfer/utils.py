from typing import Any, cast

from eth_typing import HexStr

# The address of an ERC20 token for a given network
ADDRESS_MAP = {
    "base": {
        "usdc": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    },
    "base-sepolia": {
        "usdc": "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    },
}


def get_erc20_address(token: str, network: str) -> HexStr:
    """Get the address of an ERC20 token for a given network.

    If a contract address is provided, it will not be found in the map and will be returned as is.

    Args:
        token: The token symbol or contract address
        network: The network to get the address for

    Returns:
        The address of the ERC20 token

    """
    network_addresses = ADDRESS_MAP.get(network, {})
    address = network_addresses.get(token, token)
    return cast(HexStr, address)


def map_network_to_chain_id(network: str) -> int:
    """Map a network to a chain ID.

    Args:
        network: The network to map to a chain ID

    Returns:
        The chain ID for the given network

    """
    # Network to chain ID mapping
    if network == "base":
        return 8453  # Base mainnet
    elif network == "base-sepolia":
        return 84532  # Base Sepolia testnet
    else:
        raise ValueError(f"Unsupported network: {network}")


def get_chain_config(network: str) -> dict[str, Any]:
    """Get the chain configuration for a given network.

    Args:
        network: The network to get the chain configuration for

    Returns:
        The chain configuration for the given network

    """
    chain_id = map_network_to_chain_id(network)

    # Define RPC URLs for each network
    rpc_urls = {
        8453: "https://mainnet.base.org",
        84532: "https://sepolia.base.org",
    }

    return {
        "chain_id": chain_id,
        "rpc_url": rpc_urls.get(chain_id),
    }
