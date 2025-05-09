from cdp.openapi_client.api.faucets_api import FaucetsApi
from cdp.openapi_client.models.request_solana_faucet200_response import (
    RequestSolanaFaucet200Response as RequestSolanaFaucetResponse,
)
from cdp.openapi_client.models.request_solana_faucet_request import RequestSolanaFaucetRequest


async def request_faucet(
    faucets: FaucetsApi,
    address: str,
    token: str,
) -> RequestSolanaFaucetResponse:
    """Request a faucet for the Solana account.

    Args:
        faucets (FaucetsApi): The faucets API.
        address (str): The address of the Solana account.
        token (str): The token to request the faucet for.

    Returns:
        RequestSolanaFaucetResponse: The response from the faucet.

    """
    return await faucets.request_solana_faucet(
        request_solana_faucet_request=RequestSolanaFaucetRequest(
            address=address,
            token=token,
        )
    )
