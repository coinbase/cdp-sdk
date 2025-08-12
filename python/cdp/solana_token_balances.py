from typing import Literal

from pydantic import BaseModel, Field

SolanaNetwork = Literal["solana-devnet", "solana"]


class SolanaToken(BaseModel):
    """A token on a Solana network, which is either an SPL token or a native token (i.e. SOL)."""

    mint_address: str = Field(description="The mint address of the token.")
    name: str | None = Field(
        None,
        description="The name of the token, which is optional and non-unique. Note: "
        "this field may not be present for most tokens while the API is still under development.",
    )
    symbol: str | None = Field(
        None,
        description="The symbol of the token, which is optional and non-unique. Note: "
        "this field may not be present for most tokens while the API is still under development.",
    )


class SolanaTokenAmount(BaseModel):
    """A token amount on a Solana network."""

    amount: int = Field(
        description="The amount of the token in the smallest indivisible unit of the token."
    )
    decimals: int = Field(description="The number of decimals in the token.")


class SolanaTokenBalance(BaseModel):
    """A Solana token balance."""

    token: SolanaToken = Field(description="The token.")
    amount: SolanaTokenAmount = Field(description="The amount of the token.")


class ListSolanaTokenBalancesResult(BaseModel):
    """The result of listing Solana token balances."""

    balances: list[SolanaTokenBalance] = Field(description="The token balances.")
    next_page_token: str | None = Field(
        None,
        description="The next page token to paginate through the token balances. "
        "If None, there are no more token balances to paginate through.",
    )
