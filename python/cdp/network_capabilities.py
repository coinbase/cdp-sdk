"""Centralized configuration for network capabilities.

This defines which methods are available on which networks.
"""

from typing import Literal

# Network names that are supported
NetworkName = Literal[
    "base",
    "base-sepolia",
    "ethereum",
    "ethereum-sepolia",
    "ethereum-hoodi",
    "polygon",
    "polygon-mumbai",
    "arbitrum",
    "arbitrum-sepolia",
    "optimism",
    "optimism-sepolia",
]

# Method names that can be checked
MethodName = Literal[
    "listTokenBalances",
    "requestFaucet",
    "quoteFund",
    "fund",
    "waitForFundOperationReceipt",
    "transfer",
    "sendTransaction",
    "quoteSwap",
    "swap",
]

# Network capabilities configuration
# Each network has a set of boolean flags indicating which methods are supported
NETWORK_CAPABILITIES = {
    "base": {
        "listTokenBalances": True,
        "requestFaucet": False,
        "quoteFund": True,
        "fund": True,
        "waitForFundOperationReceipt": True,
        "transfer": True,
        "sendTransaction": True,
        "quoteSwap": True,
        "swap": True,
    },
    "base-sepolia": {
        "listTokenBalances": True,
        "requestFaucet": True,
        "quoteFund": False,
        "fund": False,
        "waitForFundOperationReceipt": False,
        "transfer": True,
        "sendTransaction": True,
        "quoteSwap": False,
        "swap": False,
    },
    "ethereum": {
        "listTokenBalances": True,
        "requestFaucet": False,
        "quoteFund": False,  # Only base is supported for quoteFund
        "fund": False,  # Only base is supported for fund
        "waitForFundOperationReceipt": False,
        "transfer": True,
        "sendTransaction": True,
        "quoteSwap": True,
        "swap": True,
    },
    "ethereum-sepolia": {
        "listTokenBalances": False,
        "requestFaucet": True,
        "quoteFund": False,
        "fund": False,
        "waitForFundOperationReceipt": False,
        "transfer": True,
        "sendTransaction": True,
        "quoteSwap": False,
        "swap": False,
    },
    "ethereum-hoodi": {
        "listTokenBalances": False,
        "requestFaucet": True,
        "quoteFund": False,
        "fund": False,
        "waitForFundOperationReceipt": False,
        "transfer": False,
        "sendTransaction": True,  # Always available (uses wallet client for non-base networks)
        "quoteSwap": False,
        "swap": False,
    },
    "polygon": {
        "listTokenBalances": False,
        "requestFaucet": False,
        "quoteFund": False,
        "fund": False,
        "waitForFundOperationReceipt": False,
        "transfer": True,
        "sendTransaction": True,
        "quoteSwap": False,
        "swap": False,
    },
    "polygon-mumbai": {
        "listTokenBalances": False,
        "requestFaucet": True,
        "quoteFund": False,
        "fund": False,
        "waitForFundOperationReceipt": False,
        "transfer": True,
        "sendTransaction": True,
        "quoteSwap": False,
        "swap": False,
    },
    "arbitrum": {
        "listTokenBalances": False,
        "requestFaucet": False,
        "quoteFund": False,
        "fund": False,
        "waitForFundOperationReceipt": False,
        "transfer": True,
        "sendTransaction": True,
        "quoteSwap": False,
        "swap": False,
    },
    "arbitrum-sepolia": {
        "listTokenBalances": False,
        "requestFaucet": True,
        "quoteFund": False,
        "fund": False,
        "waitForFundOperationReceipt": False,
        "transfer": True,
        "sendTransaction": True,
        "quoteSwap": False,
        "swap": False,
    },
    "optimism": {
        "listTokenBalances": False,
        "requestFaucet": False,
        "quoteFund": False,
        "fund": False,
        "waitForFundOperationReceipt": False,
        "transfer": True,
        "sendTransaction": True,
        "quoteSwap": False,
        "swap": False,
    },
    "optimism-sepolia": {
        "listTokenBalances": False,
        "requestFaucet": True,
        "quoteFund": False,
        "fund": False,
        "waitForFundOperationReceipt": False,
        "transfer": True,
        "sendTransaction": True,
        "quoteSwap": False,
        "swap": False,
    },
}


def get_networks_supporting_method(method: MethodName) -> list[NetworkName]:
    """Get networks that support a specific method.

    Args:
        method: The method name to check support for

    Returns:
        An array of network names that support the method

    """
    return [
        network for network, config in NETWORK_CAPABILITIES.items() if config.get(method, False)
    ]


def is_method_supported_on_network(method: MethodName, network: str) -> bool:
    """Check if a network supports a method.

    Args:
        method: The method name to check
        network: The network name to check

    Returns:
        True if the network supports the method, False otherwise

    """
    network_config = NETWORK_CAPABILITIES.get(network)
    return network_config.get(method, False) if network_config else False
