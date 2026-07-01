"""Morpho Blue on Base mainnet."""

from __future__ import annotations

MORPHO_BLUE_BASE = "0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb"
MORPHO_API_URL = "https://api.morpho.org/graphql"
MORPHO_CHAIN_ID = 8453

# Adaptive Curve IRM on Base (common across markets)
ADAPTIVE_CURVE_IRM_BASE = "0x46415998764C29aB2a25CbeA6254146D50D22687"

# Blue-chip collateral/loan filters for profitable liquidations
BLUE_CHIP_SYMBOLS = frozenset(
    {"WETH", "USDC", "cbETH", "wstETH", "cbBTC", "wrsETH", "weETH", "EURC", "USDbC", "DAI"}
)

MORPHO_ABI = [
    {
        "inputs": [
            {"internalType": "bytes32", "name": "", "type": "bytes32"},
            {"internalType": "address", "name": "", "type": "address"},
        ],
        "name": "position",
        "outputs": [
            {"internalType": "uint256", "name": "supplyShares", "type": "uint256"},
            {"internalType": "uint128", "name": "borrowShares", "type": "uint128"},
            {"internalType": "uint128", "name": "collateral", "type": "uint128"},
        ],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "inputs": [{"internalType": "bytes32", "name": "", "type": "bytes32"}],
        "name": "market",
        "outputs": [
            {"internalType": "uint128", "name": "totalSupplyAssets", "type": "uint128"},
            {"internalType": "uint128", "name": "totalSupplyShares", "type": "uint128"},
            {"internalType": "uint128", "name": "totalBorrowAssets", "type": "uint128"},
            {"internalType": "uint128", "name": "totalBorrowShares", "type": "uint128"},
            {"internalType": "uint128", "name": "lastUpdate", "type": "uint128"},
            {"internalType": "uint128", "name": "fee", "type": "uint128"},
        ],
        "stateMutability": "view",
        "type": "function",
    },
]

ORACLE_ABI = [
    {
        "inputs": [],
        "name": "price",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function",
    },
]

# Morpho liquidation incentive: min(1.15, 1 / (0.3 * (1 - lltv) + 0.7))
LIQUIDATION_CURSOR = 0.3
MAX_LIF = 1.15
WAD = 10**18
ORACLE_PRICE_SCALE = 10**36

MORPHO_FLASH_LIQUIDATOR_ABI = [
    {
        "inputs": [
            {"internalType": "address", "name": "loanToken", "type": "address"},
            {"internalType": "uint256", "name": "flashAmount", "type": "uint256"},
            {
                "components": [
                    {
                        "components": [
                            {"internalType": "address", "name": "loanToken", "type": "address"},
                            {"internalType": "address", "name": "collateralToken", "type": "address"},
                            {"internalType": "address", "name": "oracle", "type": "address"},
                            {"internalType": "address", "name": "irm", "type": "address"},
                            {"internalType": "uint256", "name": "lltv", "type": "uint256"},
                        ],
                        "internalType": "struct IMorpho.MarketParams",
                        "name": "market",
                        "type": "tuple",
                    },
                    {"internalType": "address", "name": "borrower", "type": "address"},
                    {"internalType": "uint256", "name": "repaidShares", "type": "uint256"},
                    {"internalType": "uint24", "name": "swapFee", "type": "uint24"},
                    {"internalType": "uint256", "name": "minAmountOut", "type": "uint256"},
                ],
                "internalType": "struct MorphoFlashLiquidator.LiquidationParams",
                "name": "params",
                "type": "tuple",
            },
        ],
        "name": "liquidate",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function",
    },
]

MORPHO_LIQUIDATE_ABI = [
    {
        "inputs": [
            {
                "components": [
                    {"internalType": "address", "name": "loanToken", "type": "address"},
                    {"internalType": "address", "name": "collateralToken", "type": "address"},
                    {"internalType": "address", "name": "oracle", "type": "address"},
                    {"internalType": "address", "name": "irm", "type": "address"},
                    {"internalType": "uint256", "name": "lltv", "type": "uint256"},
                ],
                "internalType": "struct MarketParams",
                "name": "marketParams",
                "type": "tuple",
            },
            {"internalType": "address", "name": "borrower", "type": "address"},
            {"internalType": "uint256", "name": "seizedAssets", "type": "uint256"},
            {"internalType": "uint256", "name": "repaidShares", "type": "uint256"},
            {"internalType": "bytes", "name": "data", "type": "bytes"},
        ],
        "name": "liquidate",
        "outputs": [
            {"internalType": "uint256", "name": "", "type": "uint256"},
            {"internalType": "uint256", "name": "", "type": "uint256"},
        ],
        "stateMutability": "nonpayable",
        "type": "function",
    },
]
