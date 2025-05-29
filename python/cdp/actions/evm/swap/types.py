"""Type definitions for swap functionality."""

from typing import Any, Protocol

from eth_account.signers.base import BaseAccount
from pydantic import BaseModel, Field, field_validator

# Supported networks for swap
SUPPORTED_SWAP_NETWORKS = ["base", "ethereum"]


class CreateSwapOptions(BaseModel):
    """Options for creating a swap."""

    from_asset: str = Field(description="The asset to swap from (token symbol or contract address)")
    to_asset: str = Field(description="The asset to swap to (token symbol or contract address)")
    amount: str | int = Field(description="The amount to swap (in smallest unit or as string)")
    network: str = Field(description="The network to execute the swap on (base or ethereum only)")
    slippage_percentage: float | None = Field(
        default=0.5, description="Maximum slippage percentage (default: 0.5%)"
    )

    @field_validator("slippage_percentage")
    @classmethod
    def validate_slippage(cls, v: float | None) -> float:
        """Validate slippage percentage."""
        if v is None:
            return 0.5
        if v < 0 or v > 100:
            raise ValueError("Slippage percentage must be between 0 and 100")
        return v

    @field_validator("network")
    @classmethod
    def validate_network(cls, v: str) -> str:
        """Validate network is supported."""
        if v not in SUPPORTED_SWAP_NETWORKS:
            raise ValueError(f"Network must be one of: {', '.join(SUPPORTED_SWAP_NETWORKS)}")
        return v

    @field_validator("amount")
    @classmethod
    def validate_amount(cls, v: str | int) -> str:
        """Validate and convert amount to string."""
        return str(v)


class CreateSwapResult(BaseModel):
    """Result from createSwap API call."""

    quote_id: str = Field(description="The quote ID from the swap service")
    from_token: str = Field(description="The token being swapped from")
    to_token: str = Field(description="The token being swapped to")
    from_amount: str = Field(description="The amount being swapped")
    to_amount: str = Field(description="The expected amount to receive")
    to: str = Field(description="The contract address to send the transaction to")
    data: str = Field(description="The transaction data")
    value: str = Field(description="The transaction value in wei")
    gas_limit: int | None = Field(default=None, description="Recommended gas limit")
    gas_price: str | None = Field(default=None, description="Recommended gas price")
    max_fee_per_gas: str | None = Field(default=None, description="Max fee per gas for EIP-1559")
    max_priority_fee_per_gas: str | None = Field(
        default=None, description="Max priority fee per gas for EIP-1559"
    )


class SwapOptions(BaseModel):
    """Options for executing a swap.

    Either create_swap_options or create_swap_result must be provided, but not both.

    - If create_swap_options is provided, the SDK will call createSwap under the hood
    - If create_swap_result is provided, the SDK will use the pre-created swap data
    """

    create_swap_options: CreateSwapOptions | None = Field(
        default=None, description="Options to create a swap (SDK will call createSwap)"
    )
    create_swap_result: CreateSwapResult | None = Field(
        default=None, description="Pre-created swap result from calling createSwap"
    )

    @field_validator("create_swap_result")
    @classmethod
    def validate_mutually_exclusive(cls, v, info):
        """Ensure only one of create_swap_options or create_swap_result is provided."""
        if v is not None and info.data.get("create_swap_options") is not None:
            raise ValueError(
                "Only one of create_swap_options or create_swap_result can be provided"
            )
        return v

    def __init__(self, **data):
        """Initialize SwapOptions with validation."""
        super().__init__(**data)
        if self.create_swap_options is None and self.create_swap_result is None:
            raise ValueError("Either create_swap_options or create_swap_result must be provided")


class SwapQuote(BaseModel):
    """A swap quote from the backend."""

    quote_id: str = Field(description="Unique identifier for the quote")
    from_token: str = Field(description="The token being swapped from")
    to_token: str = Field(description="The token being swapped to")
    from_amount: str = Field(description="The amount being swapped")
    to_amount: str = Field(description="The expected amount to receive")
    price_ratio: str = Field(description="The price ratio between tokens")
    expires_at: str = Field(description="When the quote expires")


class Permit2Data(BaseModel):
    """Permit2 signature data for ERC20 token swaps."""

    eip712: dict[str, Any] = Field(description="EIP-712 typed data to sign")
    hash: str = Field(description="Hash of the Permit2 message")


class SwapTransaction(BaseModel):
    """A swap transaction ready to be signed and sent."""

    to: str = Field(description="The contract address to send the transaction to")
    data: str = Field(description="The transaction data (calldata)")
    value: int = Field(description="The amount of ETH to send with the transaction (in wei)")
    transaction: str | None = Field(default=None, description="The raw transaction if available")
    permit2_data: Permit2Data | None = Field(default=None, description="Permit2 data if required")
    requires_signature: bool = Field(
        default=False, description="Whether the transaction requires a Permit2 signature"
    )


class SwapResult(BaseModel):
    """Result of a swap transaction."""

    transaction_hash: str = Field(description="The transaction hash")
    from_token: str = Field(description="The token that was swapped from")
    to_token: str = Field(description="The token that was swapped to")
    from_amount: str = Field(description="The amount that was swapped")
    to_amount: str = Field(description="The amount that was received")
    quote_id: str = Field(description="The quote ID used for the swap")
    network: str = Field(description="The network the swap was executed on")


class SwapStrategy(Protocol):
    """Protocol for swap execution strategies."""

    async def execute_swap(
        self,
        api_clients: Any,
        from_account: BaseAccount,
        swap_options: SwapOptions,
        quote: SwapQuote,
    ) -> SwapResult:
        """Execute a swap using the strategy.

        Args:
            api_clients: The API clients instance
            from_account: The account to swap from
            swap_options: The swap options
            quote: The swap quote

        Returns:
            SwapResult: The result of the swap

        """
        ...
