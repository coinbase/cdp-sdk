from cdp.evm_token_balances import (
    EvmToken,
    EvmTokenAmount,
    EvmTokenBalance,
    ListTokenBalancesResult,
)
from cdp.openapi_client.api.onchain_data_api import OnchainDataApi


async def list_token_balances(
    onchain_data: OnchainDataApi,
    address: str,
    network: str,
    page_size: int | None = None,
    page_token: str | None = None,
) -> ListTokenBalancesResult:
    """List the token balances for an address on a given network.

    Args:
        onchain_data (OnchainDataApi): The onchain data API.
        address (str): The address to list the token balances for.
        network (str): The network to list the token balances for.
        page_size (int, optional): The number of token balances to return per page. Defaults to None.
        page_token (str, optional): The token for the next page of token balances, if any. Defaults to None.

    Returns:
        ListTokenBalancesResult: The token balances for the address.

    """
    response = await onchain_data.list_data_token_balances(
        address=address, network=network, page_size=page_size, page_token=page_token
    )
    return ListTokenBalancesResult(
        balances=[
            EvmTokenBalance(
                token=EvmToken(
                    contract_address=balance.token.contract_address,
                    network=balance.token.network,
                    symbol=balance.token.symbol,
                    name=balance.token.name,
                ),
                amount=EvmTokenAmount(
                    amount=int(balance.amount.amount),
                    decimals=balance.amount.decimals,
                ),
            )
            for balance in response.balances
        ],
        next_page_token=response.next_page_token,
    )
