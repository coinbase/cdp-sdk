from cdp.openapi_client.api.solana_accounts_api import SolanaAccountsApi
from cdp.openapi_client.models.send_solana_transaction_request import (
    SendSolanaTransactionRequest,
)


async def send_transaction(
    solana_accounts_api: SolanaAccountsApi,
    transaction: str,
    network: str,
    idempotency_key: str | None = None,
) -> str:
    """Send a Solana transaction.

    Args:
        solana_accounts_api (SolanaAccountsApi): The Solana accounts API.
        transaction (str): The transaction to send.
        network (str): The network to send the transaction to.
        idempotency_key (str, optional): The idempotency key. Defaults to None.

    """
    return await solana_accounts_api.send_solana_transaction(
        send_solana_transaction_request=SendSolanaTransactionRequest(
            network=network,
            transaction=transaction,
        ),
        x_idempotency_key=idempotency_key,
    )
