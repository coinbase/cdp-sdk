"""Constants for swap functionality."""

# Token addresses on different networks
TOKEN_ADDRESSES = {
    "eth": {
        "base": "0x0000000000000000000000000000000000000000",
        "ethereum": "0x0000000000000000000000000000000000000000",
    },
    "usdc": {
        "base": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
        "ethereum": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    },
    "weth": {
        "base": "0x4200000000000000000000000000000000000006",
        "ethereum": "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    },
}

# Swap router addresses on different networks
SWAP_ROUTER_ADDRESSES = {
    "base": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",  # 0x Protocol Exchange Proxy on Base
    "ethereum": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",  # 0x Protocol Exchange Proxy on Ethereum
}

# Default slippage percentage
DEFAULT_SLIPPAGE_PERCENTAGE = 0.5

# Maximum allowed slippage percentage
MAX_SLIPPAGE_PERCENTAGE = 10.0

# Minimum allowed slippage percentage
MIN_SLIPPAGE_PERCENTAGE = 0.0

# Gas limits for different swap types
GAS_LIMIT_SIMPLE_SWAP = 200000
GAS_LIMIT_COMPLEX_SWAP = 300000
