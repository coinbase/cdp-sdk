# flake8: noqa: N815
# Ignoring mixed case because underlying library type uses camelCase

from typing import Any

from pydantic import BaseModel, Field


class EIP712Domain(BaseModel):
    """The domain of the EIP-712 typed data."""

    model_config = {"populate_by_name": True}

    name: str | None = Field(default=None, description="The name of the DApp or protocol.")
    version: str | None = Field(default=None, description="The version of the DApp or protocol.")
    chain_id: int | None = Field(
        default=None, description="The chain ID of the EVM network.", alias="chainId"
    )
    verifying_contract: str | None = Field(
        default=None,
        description="The 0x-prefixed EVM address of the verifying smart contract.",
        alias="verifyingContract",
    )
    salt: str | None = Field(
        default=None, description="The optional 32-byte 0x-prefixed hex salt for domain separation."
    )

    def as_dict(self) -> dict[str, Any]:
        """Serialize the EIP712Domain object to a dictionary."""
        return self.model_dump(by_alias=True)
