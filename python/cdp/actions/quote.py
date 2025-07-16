from typing import Literal

from pydantic import BaseModel, ConfigDict

from cdp.actions.types import FundOperationResult
from cdp.api_clients import ApiClients
from cdp.openapi_client.models.fee import Fee


class BaseQuote(BaseModel):
    """A quote to fund an account."""

    api_clients: ApiClients
    quote_id: str
    fiat_amount: str
    fiat_currency: str
    token_amount: str
    token: str
    fees: list[Fee]

    model_config = ConfigDict(arbitrary_types_allowed=True)

    async def execute(self) -> FundOperationResult:
        """Execute the quote."""
        transfer = await self.api_clients.payments.execute_payment_transfer_quote(self.quote_id)
        return FundOperationResult(
            id=transfer.id,
            network=transfer.target.actual_instance.network,
            target_amount=transfer.target_amount,
            target_currency=transfer.target_currency,
            status=transfer.status,
            transaction_hash=transfer.transaction_hash,
        )


class EvmQuote(BaseQuote):
    """A quote to fund an EVM account."""

    network: Literal["base", "ethereum"]

    model_config = ConfigDict(arbitrary_types_allowed=True)


class SolanaQuote(BaseQuote):
    """A quote to fund a Solana account."""

    network: Literal["solana"]

    model_config = ConfigDict(arbitrary_types_allowed=True)
