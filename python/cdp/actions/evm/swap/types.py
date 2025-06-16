"""Type definitions for swap functionality."""

from typing import Any

from pydantic import BaseModel, Field, PrivateAttr, field_validator
from web3 import Web3

# Supported networks for swap
SUPPORTED_SWAP_NETWORKS = ["base", "ethereum"]


class SwapUnavailableResult(BaseModel):
    """Result indicating that a swap quote is unavailable due to insufficient liquidity."""

    liquidity_available: bool = Field(
        default=False, description="Always False for unavailable swaps"
    )


class BaseSendSwapTransactionOptions(BaseModel):
    """Base options for sending a swap transaction."""

    address: str = Field(description="The address of the account that will execute the swap")
    idempotency_key: str | None = Field(
        default=None, description="Optional idempotency key for safe retryable requests"
    )

    @field_validator("address")
    @classmethod
    def validate_address(cls, v: str) -> str:
        """Validate address format."""
        if not v.startswith("0x") or len(v) != 42:
            raise ValueError("Address must be a valid Ethereum address (0x + 40 hex chars)")
        return v


class QuoteBasedSendSwapTransactionOptions(BaseSendSwapTransactionOptions):
    """Options when providing an already created swap quote."""

    swap_quote: "QuoteSwapResult" = Field(description="A pre-created swap quote")


class InlineSendSwapTransactionOptions(BaseSendSwapTransactionOptions):
    """Options when creating a swap quote inline."""

    network: str = Field(description="The network to execute the swap on")
    from_token: str = Field(description="The token to swap from")
    to_token: str = Field(description="The token to swap to")
    from_amount: str | int = Field(description="The amount to swap")
    taker: str = Field(description="The address that will perform the swap")
    slippage_bps: int | None = Field(
        default=100, description="Maximum slippage in basis points (100 = 1%)"
    )

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

    @field_validator("from_token", "to_token", "taker")
    @classmethod
    def validate_token_addresses(cls, v: str) -> str:
        """Validate address format."""
        if not v.startswith("0x") or len(v) != 42:
            raise ValueError("Address must be a valid Ethereum address (0x + 40 hex chars)")
        return v


# Discriminated union for send_swap_transaction options
SendSwapTransactionOptions = InlineSendSwapTransactionOptions | QuoteBasedSendSwapTransactionOptions


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
    def validate_address(cls, v: str) -> str:
        """Validate address format."""
        if not v.startswith("0x") or len(v) != 42:
            raise ValueError("Address must be a valid Ethereum address (0x + 40 hex chars)")
        return v

    @field_validator("taker")
    @classmethod
    def validate_taker_address(cls, v: str | None) -> str | None:
        """Validate taker address format."""
        if v is None:
            return None
        if not v.startswith("0x") or len(v) != 42:
            raise ValueError("Taker address must be a valid Ethereum address (0x + 40 hex chars)")
        return v


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
    _smart_account: Any | None = PrivateAttr(default=None)
    _paymaster_url: str | None = PrivateAttr(default=None)

    async def execute(self, idempotency_key: str | None = None) -> "ExecuteSwapQuoteResult":
        """Execute the swap quote.

        Args:
            idempotency_key: Optional idempotency key for safe retryable requests.

        Returns:
            ExecuteSwapQuoteResult: The result of the executed swap.

        Raises:
            ValueError: If the quote was not created with proper context.

        """
        if self._taker is None or self._api_clients is None:
            raise ValueError(
                "This swap quote cannot be executed directly. "
                "Use account.swap(AccountSwapOptions(swap_quote=quote)) instead."
            )

        from cdp.actions.evm.swap import send_swap_transaction

        # Check if this is a smart account swap by looking for _smart_account
        if self._smart_account is not None:
            # Smart account swap
            from cdp.actions.evm.swap.send_swap_operation import (
                SendSwapOperationOptions,
                send_swap_operation,
            )

            options = SendSwapOperationOptions(
                smart_account=self._smart_account,
                network=self.network,
                paymaster_url=self._paymaster_url,
                swap_quote=self,
                idempotency_key=idempotency_key,
            )

            result = await send_swap_operation(
                api_clients=self._api_clients,
                options=options,
            )

            # Return ExecuteSwapQuoteResult for smart account
            return ExecuteSwapQuoteResult(
                user_op_hash=result.user_op_hash,
                smart_account_address=result.smart_account_address,
                status=result.status,
            )
        else:
            # Regular account swap
            address = self._taker

            # Create the options object for send_swap_transaction
            options = QuoteBasedSendSwapTransactionOptions(
                address=address,
                swap_quote=self,
                idempotency_key=idempotency_key,
            )

            result = await send_swap_transaction(
                api_clients=self._api_clients,
                options=options,
            )

            # Return ExecuteSwapQuoteResult for regular account
            return ExecuteSwapQuoteResult(transaction_hash=result.transaction_hash)


class AccountSwapOptions(BaseModel):
    """Options for executing a token swap via regular EOA account.

    This class represents swap options that can be either quote-based
    (using a pre-created swap quote) or inline (using direct parameters).
    """

    # Quote-based pattern
    swap_quote: "QuoteSwapResult | None" = Field(
        None, description="Pre-created swap quote to execute"
    )

    # Inline pattern fields
    network: str | None = Field(None, description="Network to execute swap on")
    from_token: str | None = Field(None, description="Address of token to swap from")
    to_token: str | None = Field(None, description="Address of token to swap to")
    from_amount: str | int | None = Field(None, description="Amount to swap in smallest units")
    slippage_bps: int | None = Field(100, description="Slippage tolerance in basis points")

    # Common fields
    idempotency_key: str | None = Field(None, description="Optional idempotency key")

    @field_validator("from_token", "to_token")
    @classmethod
    def validate_addresses(cls, v):
        """Validate Ethereum addresses."""
        if v is not None and not Web3.is_address(v):
            raise ValueError(f"Invalid Ethereum address: {v}")
        return v

    @field_validator("slippage_bps")
    @classmethod
    def validate_slippage(cls, v):
        """Validate slippage is within reasonable bounds."""
        if v is not None and (v < 0 or v > 10000):
            raise ValueError("Slippage must be between 0 and 10000 basis points")
        return v


class SmartAccountSwapOptions(BaseModel):
    """Options for executing a token swap via smart account.

    This class represents swap options that can be either quote-based
    (using a pre-created swap quote) or inline (using direct parameters).
    Same developer experience as AccountSwapOptions.
    """

    # Quote-based pattern
    swap_quote: "QuoteSwapResult | None" = Field(
        None, description="Pre-created swap quote to execute"
    )

    # Inline pattern fields
    network: str | None = Field(None, description="Network to execute swap on")
    from_token: str | None = Field(None, description="Address of token to swap from")
    to_token: str | None = Field(None, description="Address of token to swap to")
    from_amount: str | int | None = Field(None, description="Amount to swap in smallest units")
    slippage_bps: int | None = Field(100, description="Slippage tolerance in basis points")

    # Smart account specific fields
    paymaster_url: str | None = Field(
        None, description="Optional paymaster URL for gas sponsorship"
    )
    idempotency_key: str | None = Field(None, description="Optional idempotency key")

    @field_validator("from_token", "to_token")
    @classmethod
    def validate_addresses(cls, v):
        """Validate Ethereum addresses."""
        if v is not None and not Web3.is_address(v):
            raise ValueError(f"Invalid Ethereum address: {v}")
        return v

    @field_validator("slippage_bps")
    @classmethod
    def validate_slippage(cls, v):
        """Validate slippage is within reasonable bounds."""
        if v is not None and (v < 0 or v > 10000):
            raise ValueError("Slippage must be between 0 and 10000 basis points")
        return v


class SwapPriceResult(BaseModel):
    """A swap price estimate from get_swap_price."""

    quote_id: str = Field(description="Unique identifier for the price estimate")
    from_token: str = Field(description="The token being swapped from")
    to_token: str = Field(description="The token being swapped to")
    from_amount: str = Field(description="The amount being swapped")
    to_amount: str = Field(description="The expected amount to receive")
    price_ratio: str = Field(description="The price ratio between tokens")
    expires_at: str = Field(description="When the price estimate expires")


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


class AccountSwapResult(BaseModel):
    """Result of a swap transaction for regular accounts (EOA).

    Matches TypeScript's SendSwapTransactionResult which contains { transactionHash: Hex }.
    """

    transaction_hash: str = Field(description="The transaction hash of the submitted swap")


class SmartAccountSwapResult(BaseModel):
    """Result of a swap transaction for smart accounts."""

    user_op_hash: str = Field(description="The user operation hash")
    smart_account_address: str = Field(description="The smart account address")
    status: str = Field(description="The user operation status")


class ExecuteSwapQuoteResult(BaseModel):
    """Result of executing a swap quote via QuoteSwapResult.execute().

    Can contain either transaction hash (for EOA) or user operation info (for smart accounts).
    """

    # EOA swap result
    transaction_hash: str | None = Field(None, description="The transaction hash (for EOA swaps)")

    # Smart account swap result
    user_op_hash: str | None = Field(
        None, description="The user operation hash (for smart account swaps)"
    )
    smart_account_address: str | None = Field(
        None, description="The smart account address (for smart account swaps)"
    )
    status: str | None = Field(
        None, description="The user operation status (for smart account swaps)"
    )
