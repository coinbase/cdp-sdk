"""Moonwell (Compound V2 fork) on Base mainnet."""

from __future__ import annotations

MOONWELL_BASE = {
    "comptroller": "0xfBb21d0380beE3312B33c4353c8936a0F13EF26C",
    "markets": {
        "mUSDC": "0xEdc817A28E8B93B03976FBd4a3dDBc9f7D176c22",
        "mWETH": "0x628ff693426583D9a7FB391E54366292F509D457",
        "mcbETH": "0x3bf93770f2d4a794c3d9EBEfBAeBAE2a8f09A5E5",
        "mwstETH": "0x627Fe393Bc6EdDA28e99AE648fD6fF362514304b",
        "mcbBTC": "0xF877ACaFA28c19b96727966690b2f44d35aD5976",
        "mDAI": "0x73b06D8d18De422E269645eaCe15400DE7462417",
        "mAERO": "0x73902f619CEB9B31FD8EFecf435CbDf89E369Ba6",
        "mEURC": "0xb682c840B5F4FC58B20769E691A6fa1305A501a2",
    },
}

COMPTROLLER_ABI = [
    {
        "inputs": [{"internalType": "address", "name": "account", "type": "address"}],
        "name": "getAccountLiquidity",
        "outputs": [
            {"internalType": "uint256", "name": "", "type": "uint256"},
            {"internalType": "uint256", "name": "", "type": "uint256"},
            {"internalType": "uint256", "name": "", "type": "uint256"},
        ],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "inputs": [],
        "name": "closeFactorMantissa",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "inputs": [],
        "name": "liquidationIncentiveMantissa",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "inputs": [],
        "name": "getAllMarkets",
        "outputs": [{"internalType": "address[]", "name": "", "type": "address[]"}],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "inputs": [
            {"internalType": "address", "name": "account", "type": "address"},
            {"internalType": "address", "name": "mToken", "type": "address"},
        ],
        "name": "checkMembership",
        "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "inputs": [
            {"internalType": "address", "name": "mTokenBorrowed", "type": "address"},
            {"internalType": "address", "name": "mTokenCollateral", "type": "address"},
            {"internalType": "uint256", "name": "actualRepayAmount", "type": "uint256"},
        ],
        "name": "liquidateCalculateSeizeTokens",
        "outputs": [
            {"internalType": "uint256", "name": "", "type": "uint256"},
            {"internalType": "uint256", "name": "", "type": "uint256"},
        ],
        "stateMutability": "view",
        "type": "function",
    },
]

MTOKEN_ABI = [
    {
        "inputs": [],
        "name": "underlying",
        "outputs": [{"internalType": "address", "name": "", "type": "address"}],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "inputs": [{"internalType": "address", "name": "account", "type": "address"}],
        "name": "borrowBalanceStored",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "inputs": [{"internalType": "address", "name": "owner", "type": "address"}],
        "name": "balanceOf",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "inputs": [],
        "name": "exchangeRateStored",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
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
    {
        "anonymous": False,
        "inputs": [
            {"indexed": True, "internalType": "address", "name": "borrower", "type": "address"},
            {"indexed": False, "internalType": "uint256", "name": "borrowAmount", "type": "uint256"},
            {"indexed": False, "internalType": "uint256", "name": "accountBorrows", "type": "uint256"},
            {"indexed": False, "internalType": "uint256", "name": "totalBorrows", "type": "uint256"},
        ],
        "name": "Borrow",
        "type": "event",
    },
]

ERC20_ABI = [
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
