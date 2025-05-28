"""Constants for swap functionality."""

# Token addresses on different networks
TOKEN_ADDRESSES = {
    "eth": {
        "base-sepolia": "0x0000000000000000000000000000000000000000",
        "base": "0x0000000000000000000000000000000000000000",
    },
    "usdc": {
        "base-sepolia": "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
        "base": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    },
    "weth": {
        "base-sepolia": "0x4200000000000000000000000000000000000006",
        "base": "0x4200000000000000000000000000000000000006",
    },
}

# Swap router addresses on different networks
SWAP_ROUTER_ADDRESSES = {
    "base-sepolia": "0x0000000000000000000000000000000000000000",  # TODO: Add real router address
    "base": "0x0000000000000000000000000000000000000000",  # TODO: Add real router address
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
