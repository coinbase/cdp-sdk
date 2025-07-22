from cdp.openapi_client.api.solana_accounts_api import SolanaAccountsApi
from cdp.openapi_client.models.sign_solana_transaction200_response import (
    SignSolanaTransaction200Response as SignSolanaTransactionResponse,
)
from cdp.openapi_client.models.sign_solana_transaction_request import (
    SignSolanaTransactionRequest,
)


async def sign_transaction(
    solana_accounts_api: SolanaAccountsApi,
    address: str,
    transaction: str,
    idempotency_key: str,
) -> SignSolanaTransactionResponse:
    """Sign a transaction.

    Args:
        solana_accounts_api (SolanaAccountsApi): The Solana accounts API.
        address (str): The address of the Solana account.
        transaction (str): The transaction to sign.
        idempotency_key (str): The idempotency key.

    Returns:
        SignSolanaTransactionResponse: The signature of the transaction.

    """
    return await solana_accounts_api.sign_solana_transaction(
        sign_solana_transaction_request=SignSolanaTransactionRequest(
            transaction=transaction,
        ),
        address=address,
        x_idempotency_key=idempotency_key,
    )
