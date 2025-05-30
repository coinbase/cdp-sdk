"""Constants for swap functionality."""

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
