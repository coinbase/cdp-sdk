from cdp.openapi_client.api.solana_accounts_api import SolanaAccountsApi
from cdp.openapi_client.models.sign_solana_message200_response import (
    SignSolanaMessage200Response as SignSolanaMessageResponse,
)
from cdp.openapi_client.models.sign_solana_message_request import SignSolanaMessageRequest


async def sign_message(
    solana_accounts_api: SolanaAccountsApi,
    address: str,
    message: str,
    idempotency_key: str,
) -> SignSolanaMessageResponse:
    """Sign a message.

    Args:
        solana_accounts_api (SolanaAccountsApi): The Solana accounts API.
        address (str): The address of the Solana account.
        message (str): The message to sign.
        idempotency_key (str): The idempotency key.

    Returns:
        SignSolanaMessageResponse: The signature of the message.

    """
    return await solana_accounts_api.sign_solana_message(
        sign_solana_message_request=SignSolanaMessageRequest(
            message=message,
        ),
        address=address,
        x_idempotency_key=idempotency_key,
    )
