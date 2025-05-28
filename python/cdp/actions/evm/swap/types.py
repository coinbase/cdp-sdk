"""Type definitions for swap functionality."""

from typing import Union, Optional, Protocol
from pydantic import BaseModel, Field, field_validator
from eth_account.signers.base import BaseAccount


class SwapOptions(BaseModel):
    """Options for executing a swap."""
    
    from_asset: str = Field(description="The asset to swap from (token symbol or contract address)")
    to_asset: str = Field(description="The asset to swap to (token symbol or contract address)")
    amount: Union[str, int] = Field(description="The amount to swap (in smallest unit or as string)")
    network: str = Field(description="The network to execute the swap on")
    slippage_percentage: Optional[float] = Field(default=0.5, description="Maximum slippage percentage (default: 0.5%)")
    
    @field_validator("slippage_percentage")
    def validate_slippage(cls, v):
        """Validate slippage percentage is within reasonable bounds."""
        if v is not None and (v < 0 or v > 10):
            raise ValueError("Slippage percentage must be between 0 and 10")
        return v


class SwapQuote(BaseModel):
    """A quote for a swap transaction."""
    
    from_asset: str = Field(description="The asset being swapped from")
    to_asset: str = Field(description="The asset being swapped to")
    from_amount: str = Field(description="The amount being swapped from (in smallest unit)")
    to_amount: str = Field(description="The estimated amount to receive (in smallest unit)")
    price_impact: float = Field(description="The price impact percentage")
    route: list[str] = Field(description="The swap route through different pools")
    gas_estimate: Optional[str] = Field(default=None, description="Estimated gas cost in wei")
    expires_at: Optional[int] = Field(default=None, description="Unix timestamp when quote expires")
    quote_id: Optional[str] = Field(default=None, description="Unique identifier for the quote")


class SwapResult(BaseModel):
    """Result of a swap transaction."""
    
    transaction_hash: str = Field(description="The transaction hash of the swap")
    from_asset: str = Field(description="The asset swapped from")
    to_asset: str = Field(description="The asset swapped to")
    from_amount: str = Field(description="The amount swapped from")
    to_amount: str = Field(description="The amount received")
    status: str = Field(description="The status of the swap transaction")
    

class SwapStrategy(Protocol):
    """Protocol for swap strategy implementations."""
    
    async def execute_swap(
        self,
        api_clients,
        from_account: BaseAccount,
        swap_options: SwapOptions,
        quote: SwapQuote,
    ) -> SwapResult:
        """Execute a swap transaction.
        
        Args:
            api_clients: The API clients instance
            from_account: The account executing the swap
            swap_options: The swap options
            quote: The swap quote
            
        Returns:
            SwapResult: The result of the swap
        """
        ... 