"""Types for Spend Permissions."""

from datetime import datetime
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


class SpendPermissionInput(BaseModel):
    """Simplified spend permission input that allows token symbols and optional fields."""

    account: str = Field(description="The account address that owns the tokens")
    spender: str = Field(description="The address that is authorized to spend the tokens")
    token: Literal["eth", "usdc"] | str = Field(
        description="Token symbol (eth, usdc) or contract address"
    )
    allowance: int = Field(
        description="The maximum amount that can be spent (in wei for ETH, or token's smallest unit)"
    )
    period: int | None = Field(
        default=None, description="Time period in seconds for the spending allowance"
    )
    period_in_days: int | None = Field(
        default=None, description="Time period in days for the spending allowance"
    )
    start: datetime | None = Field(
        default=None, description="Start time for when the permission becomes valid"
    )
    end: datetime | None = Field(
        default=None, description="End time for when the permission expires"
    )
    salt: int | None = Field(default=None, description="Unique salt to prevent replay attacks")
    extra_data: str | None = Field(default=None, description="Additional data for the permission")
