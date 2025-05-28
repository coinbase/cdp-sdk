from typing import cast

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
