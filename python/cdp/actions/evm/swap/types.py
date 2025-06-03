"""Type definitions for swap functionality."""

from typing import Any, Protocol

from eth_account.signers.base import BaseAccount
from pydantic import BaseModel, Field, PrivateAttr, field_validator

# Supported networks for swap
SUPPORTED_SWAP_NETWORKS = ["base", "ethereum"]


class SwapParams(BaseModel):
    """Parameters for creating a swap, aligned with OpenAPI spec."""

    buy_token: str = Field(description="The contract address of the token to buy")
    sell_token: str = Field(description="The contract address of the token to sell")
    sell_amount: str | int = Field(description="The amount to sell (in smallest unit or as string)")
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

    @field_validator("sell_amount")
    @classmethod
    def validate_amount(cls, v: str | int) -> str:
        """Validate and convert amount to string."""
        return str(v)

    @field_validator("buy_token", "sell_token")
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


class SwapQuoteResult(BaseModel):
    """Result from create_swap_quote API call containing quote and transaction data."""

    quote_id: str = Field(description="The quote ID from the swap service")
    buy_token: str = Field(description="The token address being bought")
    sell_token: str = Field(description="The token address being sold")
    buy_amount: str = Field(description="The expected amount to receive")
    sell_amount: str = Field(description="The amount being sold")
    min_buy_amount: str = Field(description="The minimum amount to receive after slippage")
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

    # Private fields to store the account that created this quote
    _from_account: BaseAccount | None = PrivateAttr(default=None)
    _api_clients: Any | None = PrivateAttr(default=None)

    async def execute(self) -> str:
        """Execute the swap quote.

        Returns:
            str: The transaction hash of the executed swap.

        Raises:
            ValueError: If the quote was not created through an account's swap method.

        """
        if self._from_account is None or self._api_clients is None:
            raise ValueError(
                "This swap quote cannot be executed directly. " "Use account.swap(quote) instead."
            )

        from cdp.actions.evm.swap import AccountSwapStrategy, SwapOptions, swap

        result = await swap(
            api_clients=self._api_clients,
            from_account=self._from_account,
            swap_options=SwapOptions(swapQuote=self),
            swap_strategy=AccountSwapStrategy(),
        )
        return result.transaction_hash


class SwapOptions(BaseModel):
    """Options for initiating a swap transaction.

    Contains one of:
    1. swap_params: SwapParams object with swap parameters (new API)
    2. swapQuote: Pre-created swap quote from create_swap_quote
    """

    swap_params: SwapParams | None = None
    swapQuote: SwapQuoteResult | None = None  # noqa: N815

    def __init__(self, **data):
        """Initialize SwapOptions with validation."""
        # Handle backward compatibility
        if "swap_quote_result" in data:
            data["swapQuote"] = data.pop("swap_quote_result")

        super().__init__(**data)

        # Count how many options are provided
        options_count = sum(
            x is not None
            for x in [
                self.swap_params,
                self.swapQuote,
            ]
        )

        if options_count == 0:
            raise ValueError("One of swap_params or swapQuote must be provided")
        elif options_count > 1:
            raise ValueError("Only one of swap_params or swapQuote can be provided")


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


class SwapTransaction(BaseModel):
    """A swap transaction ready to be sent."""

    to: str = Field(description="The contract address to send the transaction to")
    data: str = Field(description="The transaction data")
    value: int = Field(description="The transaction value in wei")
    transaction: Any | None = Field(default=None, description="The raw transaction object")
    permit2_data: Permit2Data | None = Field(default=None, description="Permit2 data if required")
    requires_signature: bool = Field(default=False, description="Whether signature is required")


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
        swap_data: SwapQuoteResult,
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
