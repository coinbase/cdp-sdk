"""Types for Spend Permissions."""

from typing import Literal

from pydantic import BaseModel, Field


class SpendPermission(BaseModel):
    """A spend permission structure that defines authorization for spending tokens."""

    account: str = Field(description="The account address that owns the tokens")
    spender: str = Field(description="The address that is authorized to spend the tokens")
    token: str = Field(
        description="The token contract address (use 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE for ETH)"
    )
    allowance: int = Field(
        description="The maximum amount that can be spent (in wei for ETH, or token's smallest unit)"
    )
    period: int = Field(description="Time period in seconds for the spending allowance")
    start: int = Field(description="Start timestamp for when the permission becomes valid")
    end: int = Field(description="End timestamp for when the permission expires")
    salt: int = Field(description="Unique salt to prevent replay attacks")
    extra_data: str = Field(description="Additional data for the permission")


# Networks that the SpendPermissionManager contract supports.
# From https://github.com/coinbase/spend-permissions/blob/main/README.md#deployments
SpendPermissionNetworks = Literal[
    "base",
    "base-sepolia",
    "ethereum",
    "ethereum-sepolia",
    "optimism",
    "optimism-sepolia",
    "arbitrum",
    "avalanche",
    "binance",
    "polygon",
    "zora",
]
