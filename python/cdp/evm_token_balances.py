from pydantic import BaseModel, Field

from cdp.openapi_client.models.list_evm_token_balances_network import ListEvmTokenBalancesNetwork


class EvmToken(BaseModel):
    """A token on an EVM network, which is either an ERC-20 or a native token (i.e. ETH)."""

    contract_address: str = Field(
        description="The contract address of the token. For Ether, the contract address is "
        "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE per EIP-7528. For ERC-20 tokens, "
        "this is the contract address where the token is deployed."
    )
    network: ListEvmTokenBalancesNetwork = Field(description="The network the token is on.")
    symbol: str | None = Field(
        None,
        description="The symbol of the token, which is optional and non-unique. Note: "
        "this field may not be present for most tokens while the API is still under development.",
    )
    name: str | None = Field(
        None,
        description="The name of the token, which is optional and non-unique. Note: "
        "this field may not be present for most tokens while the API is still under development.",
    )


class EvmTokenAmount(BaseModel):
    """A token amount on an EVM network."""

    amount: int = Field(
        description="The amount of the token in the smallest indivisible unit of the token."
    )
    decimals: int = Field(description="The number of decimals in the token.")


class EvmTokenBalance(BaseModel):
    """An EVM token balance."""

    token: EvmToken = Field(description="The token.")
    amount: EvmTokenAmount = Field(description="The amount of the token.")


class ListTokenBalancesResult(BaseModel):
    """The result of listing EVM token balances."""

    balances: list[EvmTokenBalance] = Field(description="The token balances.")
    next_page_token: str | None = Field(
        None,
        description="The next page token to paginate through the token balances. "
        "If None, there are no more token balances to paginate through.",
    )
