from typing import Literal

from pydantic import BaseModel, ConfigDict

from cdp.actions.evm.fund.types import FundOperationResult
from cdp.api_clients import ApiClients
from cdp.openapi_client.models.fee import Fee


class Quote(BaseModel):
    """A quote to fund an EVM account."""

    api_clients: ApiClients
    quote_id: str
    network: Literal["base", "ethereum"]
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
