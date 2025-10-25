from typing import Any

from eth_typing import HexAddress
from pydantic import BaseModel, Field, StrictStr
from web3.types import HexStr, Wei


class EncodedCall(BaseModel):
    """Represents an encoded call to a smart contract."""

    to: HexAddress = Field(..., description="Target contract address")
    value: Wei | None = Field(None, description="Amount of native currency to send")
    data: HexStr | None = Field(None, description="Encoded call data")
    override_gas_limit: StrictStr | None = Field(
        None, description="The override gas limit to use for the call."
    )


class FunctionCall(BaseModel):
    """Represents a call to a smart contract that needs to be encoded using the ABI."""

    to: HexAddress = Field(..., description="Target contract address")
    value: Wei | None = Field(None, description="Amount of native currency to send")
    override_gas_limit: StrictStr | None = Field(
        None, description="The override gas limit to use for the call."
    )
    abi: list[dict[str, Any]] = Field(..., description="Contract ABI specification")
    function_name: str = Field(..., description="Name of the function to call")
    args: list[Any] = Field(..., description="Arguments to pass to the function")


ContractCall = EncodedCall | FunctionCall
