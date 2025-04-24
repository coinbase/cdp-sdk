from pydantic import BaseModel, ConfigDict, Field

from cdp.openapi_client.models.solana_account import SolanaAccount as SolanaAccountModel


class ListSolanaAccountsResponse(BaseModel):
    """Response model for listing Solana accounts."""

    accounts: list[SolanaAccountModel] = Field(description="List of Solana accounts.")
    next_page_token: str | None = Field(
        None,
        description="Token for the next page of results. If None, there are no more results.",
    )

    model_config = ConfigDict(arbitrary_types_allowed=True)
