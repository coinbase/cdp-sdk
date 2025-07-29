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
    "list_token_balances",
    "request_faucet",
    "quote_fund",
    "fund",
    "wait_for_fund_operation_receipt",
    "transfer",
    "send_transaction",
    "quote_swap",
    "swap",
]

# Network capabilities configuration
# Each network has a set of boolean flags indicating which methods are supported
NETWORK_CAPABILITIES = {
    "base": {
        "list_token_balances": True,
        "request_faucet": False,
        "quote_fund": True,
        "fund": True,
        "wait_for_fund_operation_receipt": True,
        "transfer": True,
        "send_transaction": True,
        "quote_swap": True,
        "swap": True,
    },
    "base-sepolia": {
        "list_token_balances": True,
        "request_faucet": True,
        "quote_fund": False,
        "fund": False,
        "wait_for_fund_operation_receipt": False,
        "transfer": True,
        "send_transaction": True,
        "quote_swap": False,
        "swap": False,
    },
    "ethereum": {
        "list_token_balances": True,
        "request_faucet": False,
        "quote_fund": False,  # Only base is supported for quote_fund
        "fund": False,  # Only base is supported for fund
        "wait_for_fund_operation_receipt": False,
        "transfer": True,
        "send_transaction": True,
        "quote_swap": True,
        "swap": True,
    },
    "ethereum-sepolia": {
        "list_token_balances": False,
        "request_faucet": True,
        "quote_fund": False,
        "fund": False,
        "wait_for_fund_operation_receipt": False,
        "transfer": True,
        "send_transaction": True,
        "quote_swap": False,
        "swap": False,
    },
    "ethereum-hoodi": {
        "list_token_balances": False,
        "request_faucet": True,
        "quote_fund": False,
        "fund": False,
        "wait_for_fund_operation_receipt": False,
        "transfer": False,
        "send_transaction": True,  # Always available (uses wallet client for non-base networks)
        "quote_swap": False,
        "swap": False,
    },
    "polygon": {
        "list_token_balances": False,
        "request_faucet": False,
        "quote_fund": False,
        "fund": False,
        "wait_for_fund_operation_receipt": False,
        "transfer": True,
        "send_transaction": True,
        "quote_swap": False,
        "swap": False,
    },
    "polygon-mumbai": {
        "list_token_balances": False,
        "request_faucet": True,
        "quote_fund": False,
        "fund": False,
        "wait_for_fund_operation_receipt": False,
        "transfer": True,
        "send_transaction": True,
        "quote_swap": False,
        "swap": False,
    },
    "arbitrum": {
        "list_token_balances": False,
        "request_faucet": False,
        "quote_fund": False,
        "fund": False,
        "wait_for_fund_operation_receipt": False,
        "transfer": True,
        "send_transaction": True,
        "quote_swap": False,
        "swap": False,
    },
    "arbitrum-sepolia": {
        "list_token_balances": False,
        "request_faucet": True,
        "quote_fund": False,
        "fund": False,
        "wait_for_fund_operation_receipt": False,
        "transfer": True,
        "send_transaction": True,
        "quote_swap": False,
        "swap": False,
    },
    "optimism": {
        "list_token_balances": False,
        "request_faucet": False,
        "quote_fund": False,
        "fund": False,
        "wait_for_fund_operation_receipt": False,
        "transfer": True,
        "send_transaction": True,
        "quote_swap": False,
        "swap": False,
    },
    "optimism-sepolia": {
        "list_token_balances": False,
        "request_faucet": True,
        "quote_fund": False,
        "fund": False,
        "wait_for_fund_operation_receipt": False,
        "transfer": True,
        "send_transaction": True,
        "quote_swap": False,
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
