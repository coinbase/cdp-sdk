# flake8: noqa: N815
# Ignoring mixed case because underlying library type uses camelCase

from typing import Any

from eth_typing import HexAddress
from pydantic import BaseModel, Field
from web3.types import HexStr


class TransactionRequestEIP1559(BaseModel):
    """Represents a transaction request using EIP-1559. Used with EthAccount's DynamicFeeTransaction."""

    to: HexAddress = Field(
        description="The address of the contract or account to send the transaction to."
    )
    value: int | None = Field(
        default=0, description="The amount of ETH, in wei, to send with the transaction."
    )
    data: HexStr | None = Field(
        default="0x",
        description="The data to send with the transaction; only used for contract calls.",
    )
    gas: int | None = Field(default=0, description="The amount of gas to use for the transaction.")
    nonce: int | None = Field(
        default=0,
        description="The nonce to use for the transaction. "
        "If not provided, the API will assign a nonce to the transaction "
        "based on the current state of the account.",
    )
    maxFeePerGas: int | None = Field(
        default=0,
        description="The maximum fee per gas to use for the transaction. "
        "If not provided, the API will estimate a value based on current network conditions.",
    )
    maxPriorityFeePerGas: int | None = Field(
        default=0,
        description="The maximum priority fee per gas to use for the transaction. "
        "If not provided, the API will estimate a value based on current network conditions.",
    )
    accessList: list[dict[str, Any]] | None = Field(
        default=[], description="The access list to use for the transaction."
    )
    chainId: int | None = Field(
        default=0,
        description="(Ignored) The value of the `chainId` field in the transaction is ignored.",
    )
    type: str | None = Field(
        default="0x2", description="(Ignored) The transaction type is always `eip1559`."
    )

    def as_dict(self) -> dict[str, Any]:
        """Serialize the TransactionRequestEIP1559 object to a dictionary."""
        return self.model_dump()
