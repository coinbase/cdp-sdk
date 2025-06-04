"""Type definitions for swap functionality."""

from typing import Any, Protocol

from eth_account.signers.base import BaseAccount
from pydantic import BaseModel, Field, PrivateAttr, field_validator

# Supported networks for swap
SUPPORTED_SWAP_NETWORKS = ["base", "ethereum"]


class SwapUnavailableResult(BaseModel):
    """Result indicating that a swap quote is unavailable due to insufficient liquidity."""

    liquidity_available: bool = Field(
        default=False, description="Always False for unavailable swaps"
    )


class SwapParams(BaseModel):
    """Parameters for creating a swap, aligned with OpenAPI spec."""

    from_token: str = Field(description="The contract address of the token to swap from")
    to_token: str = Field(description="The contract address of the token to swap to")
    from_amount: str | int = Field(
        description="The amount to swap from (in smallest unit or as string)"
    )
    network: str = Field(description="The network to execute the swap on")
    taker: str | None = Field(default=None, description="The address that will execute the swap")
    slippage_bps: int | None = Field(
        default=100, description="Maximum slippage in basis points (100 = 1%)"
    )

    @field_validator("slippage_bps")
    @classmethod
    def validate_slippage_bps(cls, v: int | None) -> int:
        """Validate slippage basis points."""
        if v is None:
            return 100  # 1% default
        if v < 0 or v > 10000:
            raise ValueError("Slippage basis points must be between 0 and 10000")
        return v

    @field_validator("network")
    @classmethod
    def validate_network(cls, v: str) -> str:
        """Validate network is supported."""
        if v not in SUPPORTED_SWAP_NETWORKS:
            raise ValueError(f"Network must be one of: {', '.join(SUPPORTED_SWAP_NETWORKS)}")
        return v

    @field_validator("from_amount")
    @classmethod
    def validate_amount(cls, v: str | int) -> str:
        """Validate and convert amount to string."""
        return str(v)

    @field_validator("from_token", "to_token")
    @classmethod
    def validate_token_address(cls, v: str) -> str:
        """Validate token address format."""
        if not v.startswith("0x") or len(v) != 42:
            raise ValueError("Token address must be a valid Ethereum address (0x + 40 hex chars)")
        return v.lower()  # Normalize to lowercase

    @field_validator("taker")
    @classmethod
    def validate_taker_address(cls, v: str | None) -> str | None:
        """Validate taker address format."""
        if v is None:
            return None
        if not v.startswith("0x") or len(v) != 42:
            raise ValueError("Taker address must be a valid Ethereum address (0x + 40 hex chars)")
        return v.lower()  # Normalize to lowercase


class QuoteSwapResult(BaseModel):
    """Result from create_swap_quote API call containing quote and transaction data."""

    liquidity_available: bool = Field(default=True, description="Always True for available swaps")
    quote_id: str = Field(description="The quote ID from the swap service")
    from_token: str = Field(description="The token address being swapped from")
    to_token: str = Field(description="The token address being swapped to")
    from_amount: str = Field(description="The amount being swapped from")
    to_amount: str = Field(description="The expected amount to receive")
    min_to_amount: str = Field(description="The minimum amount to receive after slippage")
    to: str = Field(description="The contract address to send the transaction to")
    data: str = Field(description="The transaction data")
    value: str = Field(description="The transaction value in wei")
    gas_limit: int | None = Field(default=None, description="Recommended gas limit")
    gas_price: str | None = Field(default=None, description="Recommended gas price")
    max_fee_per_gas: str | None = Field(default=None, description="Max fee per gas for EIP-1559")
    max_priority_fee_per_gas: str | None = Field(
        default=None, description="Max priority fee per gas for EIP-1559"
    )
    network: str = Field(description="The network for this swap")
    permit2_data: Any | None = Field(default=None, description="Permit2 signature data if required")
    requires_signature: bool = Field(
        default=False, description="Whether Permit2 signature is needed"
    )

    # Private fields to store context for execute()
    _taker: str | None = PrivateAttr(default=None)
    _signer_address: str | None = PrivateAttr(default=None)
    _api_clients: Any | None = PrivateAttr(default=None)

    async def execute(self) -> str:
        """Execute the swap quote.

        Returns:
            str: The transaction hash of the executed swap.

        Raises:
            ValueError: If the quote was not created with proper context.

        """
        if self._taker is None or self._api_clients is None:
            raise ValueError(
                "This swap quote cannot be executed directly. "
                "Use account.swap(SwapOptions(swap_quote=quote)) instead."
            )

        from cdp.actions.evm.swap import send_swap_transaction

        # Use signer_address if available (for smart accounts), otherwise use taker
        address = self._signer_address or self._taker

        result = await send_swap_transaction(
            api_clients=self._api_clients,
            address=address,
            network=self.network,
            swap_quote=self,
        )
        return result.transaction_hash


class SwapOptions(BaseModel):
    """Options for initiating a swap transaction.

    Must contain EITHER:
    - Direct swap parameters (network, from_token, to_token, etc.)
    - A pre-created swap quote (swap_quote)

    Note: For account.swap(), the taker is always the account address.
    For global methods, use create_swap_quote() which requires explicit taker.
    """

    # Direct swap parameters
    network: str | None = Field(default=None, description="The network to execute the swap on")
    from_token: str | None = Field(default=None, description="The token address to swap from")
    to_token: str | None = Field(default=None, description="The token address to swap to")
    from_amount: str | int | None = Field(default=None, description="The amount to swap from")
    slippage_bps: int | None = Field(
        default=None, description="Maximum slippage in basis points (100 = 1%)"
    )

    # Pre-created swap quote
    swap_quote: QuoteSwapResult | None = Field(
        default=None, description="A pre-created swap quote from create_swap_quote"
    )

    def __init__(self, **data):
        """Initialize SwapOptions with validation."""
        super().__init__(**data)

        # Check if we have direct parameters
        has_direct_params = all(
            x is not None for x in [self.network, self.from_token, self.to_token, self.from_amount]
        )

        # Check if we have swap quote
        has_swap_quote = self.swap_quote is not None

        if not has_direct_params and not has_swap_quote:
            raise ValueError(
                "SwapOptions must contain either direct swap parameters "
                "(network, from_token, to_token, from_amount) or a swap_quote"
            )

        if has_direct_params and has_swap_quote:
            raise ValueError(
                "SwapOptions cannot contain both direct swap parameters and a swap_quote. "
                "Please provide only one."
            )

        # Apply defaults for direct parameters if provided
        if has_direct_params and self.slippage_bps is None:
            self.slippage_bps = 100  # Default 1% slippage


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
    """Permit2 signature data for token swaps."""

    eip712: dict[str, Any] = Field(description="EIP-712 typed data to sign")
    hash: str = Field(description="The hash of the permit data")


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
        swap_data: QuoteSwapResult,
        network: str,
        permit2_signature: str | None = None,
    ) -> SwapResult:
        """Execute a swap using the strategy.

        Args:
            api_clients: The API clients instance
            from_account: The account to swap from
            swap_data: The swap data
            network: The network to execute on
            permit2_signature: Optional Permit2 signature

        Returns:
            SwapResult: The result of the swap

        """
        ...
