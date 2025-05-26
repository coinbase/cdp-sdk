from pydantic import BaseModel

from cdp.openapi_client.models.transfer import Transfer


class FundOperationResult(BaseModel):
    """An amount of a fee in a quote."""

    transfer: Transfer
