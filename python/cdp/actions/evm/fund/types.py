from pydantic import BaseModel


class FundOperationResult(BaseModel):
    """The result of a fund operation."""

    """
    The result of a fund operation.

    Attributes:
        id: The transfer that was created to fund the account.
        network: The network that the transfer was created on.
        target_amount: The target amount that will be received.
        target_currency: The currency that will be received.
        status: The status of the fund operation.
        transaction_hash: The transaction hash of the transfer. This is None if the transfer is pending.
    """

    id: str
    network: str
    target_amount: str
    target_currency: str
    status: str
    transaction_hash: str | None
