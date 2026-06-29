"""Aave V3 Base mainnet / Base Sepolia protocol constants and minimal ABIs."""

from __future__ import annotations

# Base mainnet — sourced from bgd-labs/aave-address-book AaveV3Base
AAVE_V3_BASE = {
    "pool_addresses_provider": "0xe20fCBdBfFC4Dd138cE8b2E6FBb6CB49777ad64D",
    "pool": "0xA238Dd80C259a72e81d7e4664a9801593F98d1c5",
    "pool_data_provider": "0x0F43731EB8d45A581f4a36DD74F5f358bc90C73A",
    "oracle": "0x2Cc0Fc26eD4563A5ce5e8bdcfe1A2878676Ae156",
    "ui_pool_data_provider": "0xb84A20e848baE3e13897934bB4e74E2225f4546B",
}

# Base Sepolia testnet deployment
AAVE_V3_BASE_SEPOLIA = {
    "pool_addresses_provider": "0x07EA79F68B2B3df564D0A34F8e19D9B1e339814b",
    "pool": "0x8bCCd74e8b2B3df564D0A34F8e19D9B1e339814b",
    "pool_data_provider": "0x2f6571d3C38F1eBdE7334B582fEbC3fB01f7f3E57",
    "oracle": "0x2Cb2A29C911d9b5f30c94721D0c69de8c7809318",
    "ui_pool_data_provider": "0xb84A20e848baE3e13897934bB4e74E2225f4546B",
}

UNISWAP_V3_SWAP_ROUTER_BASE = "0x2626664c2603336E57B271c5C0b26F421741e481"
MULTICALL3 = "0xcA11bde05977b3631167028862bE2a173976CA11"

# Common Base assets
WETH_BASE = "0x4200000000000000000000000000000000000006"
USDC_BASE = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
CBETH_BASE = "0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22"

AAVE_BASE_SUBGRAPH = (
    "https://gateway.thegraph.com/api/subgraphs/id/"
    "GQFbb95cE6d8mV989mL5figjaGaKCQB3xqYrr1bRyXqF"
)

AAVE_GRAPHQL_API = "https://api.v3.aave.com/graphql"

POOL_ABI = [
    {
        "inputs": [{"internalType": "address", "name": "user", "type": "address"}],
        "name": "getUserAccountData",
        "outputs": [
            {"internalType": "uint256", "name": "totalCollateralBase", "type": "uint256"},
            {"internalType": "uint256", "name": "totalDebtBase", "type": "uint256"},
            {"internalType": "uint256", "name": "availableBorrowsBase", "type": "uint256"},
            {"internalType": "uint256", "name": "currentLiquidationThreshold", "type": "uint256"},
            {"internalType": "uint256", "name": "ltv", "type": "uint256"},
            {"internalType": "uint256", "name": "healthFactor", "type": "uint256"},
        ],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "anonymous": False,
        "inputs": [
            {"indexed": True, "internalType": "address", "name": "reserve", "type": "address"},
            {"indexed": False, "internalType": "address", "name": "user", "type": "address"},
            {"indexed": True, "internalType": "address", "name": "onBehalfOf", "type": "address"},
            {"indexed": False, "internalType": "uint256", "name": "amount", "type": "uint256"},
            {"indexed": False, "internalType": "uint8", "name": "interestRateMode", "type": "uint8"},
            {"indexed": False, "internalType": "uint256", "name": "borrowRate", "type": "uint256"},
            {"indexed": True, "internalType": "uint16", "name": "referralCode", "type": "uint16"},
        ],
        "name": "Borrow",
        "type": "event",
    },
    {
        "anonymous": False,
        "inputs": [
            {"indexed": True, "internalType": "address", "name": "collateralAsset", "type": "address"},
            {"indexed": True, "internalType": "address", "name": "debtAsset", "type": "address"},
            {"indexed": True, "internalType": "address", "name": "user", "type": "address"},
            {"indexed": False, "internalType": "uint256", "name": "debtToCover", "type": "uint256"},
            {"indexed": False, "internalType": "uint256", "name": "liquidatedCollateralAmount", "type": "uint256"},
            {"indexed": False, "internalType": "address", "name": "liquidator", "type": "address"},
            {"indexed": False, "internalType": "bool", "name": "receiveAToken", "type": "bool"},
        ],
        "name": "LiquidationCall",
        "type": "event",
    },
]

POOL_DATA_PROVIDER_ABI = [
    {
        "inputs": [],
        "name": "getAllReservesTokens",
        "outputs": [
            {
                "components": [
                    {"internalType": "string", "name": "symbol", "type": "string"},
                    {"internalType": "address", "name": "tokenAddress", "type": "address"},
                ],
                "internalType": "struct IPoolDataProvider.TokenData[]",
                "name": "",
                "type": "tuple[]",
            }
        ],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "inputs": [
            {"internalType": "address", "name": "asset", "type": "address"},
            {"internalType": "address", "name": "user", "type": "address"},
        ],
        "name": "getUserReserveData",
        "outputs": [
            {"internalType": "uint256", "name": "currentATokenBalance", "type": "uint256"},
            {"internalType": "uint256", "name": "currentStableDebt", "type": "uint256"},
            {"internalType": "uint256", "name": "currentVariableDebt", "type": "uint256"},
            {"internalType": "uint256", "name": "principalStableDebt", "type": "uint256"},
            {"internalType": "uint256", "name": "scaledVariableDebt", "type": "uint256"},
            {"internalType": "uint256", "name": "stableBorrowRate", "type": "uint256"},
            {"internalType": "uint256", "name": "liquidityRate", "type": "uint256"},
            {"internalType": "uint40", "name": "stableRateLastUpdated", "type": "uint40"},
            {"internalType": "bool", "name": "usageAsCollateralEnabled", "type": "bool"},
        ],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "inputs": [{"internalType": "address", "name": "asset", "type": "address"}],
        "name": "getReserveConfigurationData",
        "outputs": [
            {"internalType": "uint256", "name": "decimals", "type": "uint256"},
            {"internalType": "uint256", "name": "ltv", "type": "uint256"},
            {"internalType": "uint256", "name": "liquidationThreshold", "type": "uint256"},
            {"internalType": "uint256", "name": "liquidationBonus", "type": "uint256"},
            {"internalType": "uint256", "name": "reserveFactor", "type": "uint256"},
            {"internalType": "bool", "name": "usageAsCollateralEnabled", "type": "bool"},
            {"internalType": "bool", "name": "borrowingEnabled", "type": "bool"},
            {"internalType": "bool", "name": "stableBorrowRateEnabled", "type": "bool"},
            {"internalType": "bool", "name": "isActive", "type": "bool"},
            {"internalType": "bool", "name": "isFrozen", "type": "bool"},
        ],
        "stateMutability": "view",
        "type": "function",
    },
]

ERC20_ABI = [
    {
        "inputs": [{"internalType": "address", "name": "account", "type": "address"}],
        "name": "balanceOf",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "inputs": [],
        "name": "decimals",
        "outputs": [{"internalType": "uint8", "name": "", "type": "uint8"}],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "inputs": [],
        "name": "symbol",
        "outputs": [{"internalType": "string", "name": "", "type": "string"}],
        "stateMutability": "view",
        "type": "function",
    },
]

FLASH_LIQUIDATOR_ABI = [
    {
        "inputs": [
            {"internalType": "address", "name": "debtAsset", "type": "address"},
            {"internalType": "uint256", "name": "flashAmount", "type": "uint256"},
            {
                "components": [
                    {"internalType": "address", "name": "collateralAsset", "type": "address"},
                    {"internalType": "address", "name": "debtAsset", "type": "address"},
                    {"internalType": "address", "name": "user", "type": "address"},
                    {"internalType": "uint256", "name": "debtToCover", "type": "uint256"},
                    {"internalType": "uint24", "name": "swapFee", "type": "uint24"},
                    {"internalType": "uint256", "name": "minAmountOut", "type": "uint256"},
                ],
                "internalType": "struct FlashLiquidator.LiquidationParams",
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


def get_aave_addresses(network: str) -> dict[str, str]:
    if network == "base-sepolia":
        return AAVE_V3_BASE_SEPOLIA
    return AAVE_V3_BASE
