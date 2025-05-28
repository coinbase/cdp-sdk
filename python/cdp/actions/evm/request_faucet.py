from cdp.openapi_client.api.faucets_api import FaucetsApi
from cdp.openapi_client.models.request_evm_faucet_request import RequestEvmFaucetRequest


async def request_faucet(
    faucets: FaucetsApi,
    address: str,
    network: str,
    token: str,
) -> str:
    """Request a token from the faucet in the test network.

    Args:
        faucets (FaucetsApi): The faucets API.
        address (str): The address to request the faucet for.
        network (str): The network to request the faucet for.
        token (str): The token to request the faucet for.

    Returns:
        str: The transaction hash of the faucet request.

    """
    response = await faucets.request_evm_faucet(
        request_evm_faucet_request=RequestEvmFaucetRequest(
            address=address, network=network, token=token
        )
    )
    return response.transaction_hash
