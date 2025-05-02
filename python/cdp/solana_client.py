from cdp.api_clients import ApiClients
from cdp.openapi_client.errors import ApiError
from cdp.openapi_client.models.create_solana_account_request import (
    CreateSolanaAccountRequest,
)
from cdp.openapi_client.models.list_solana_accounts200_response import (
    ListSolanaAccounts200Response as ListSolanaAccountsResponse,
)
from cdp.openapi_client.models.request_solana_faucet200_response import (
    RequestSolanaFaucet200Response as RequestSolanaFaucetResponse,
)
from cdp.openapi_client.models.request_solana_faucet_request import (
    RequestSolanaFaucetRequest,
)
from cdp.openapi_client.models.sign_solana_message200_response import (
    SignSolanaMessage200Response as SignSolanaMessageResponse,
)
from cdp.openapi_client.models.sign_solana_message_request import (
    SignSolanaMessageRequest,
)
from cdp.openapi_client.models.sign_solana_transaction200_response import (
    SignSolanaTransaction200Response as SignSolanaTransactionResponse,
)
from cdp.openapi_client.models.sign_solana_transaction_request import (
    SignSolanaTransactionRequest,
)
from cdp.openapi_client.models.solana_account import SolanaAccount


class SolanaClient:
    """The SolanaClient class is responsible for CDP API calls for Solana."""

    def __init__(self, api_clients: ApiClients):
        self.api_clients = api_clients

    async def create_account(
        self,
        name: str | None = None,
        idempotency_key: str | None = None,
    ) -> SolanaAccount:
        """Create a Solana account.

        Args:
            name (str, optional): The name. Defaults to None.
            idempotency_key (str, optional): The idempotency key. Defaults to None.

        Returns:
            SolanaAccount: The Solana account model.

        """
        return await self.api_clients.solana_accounts.create_solana_account(
            x_idempotency_key=idempotency_key,
            create_solana_account_request=CreateSolanaAccountRequest(name=name),
        )

    async def get_account(
        self, address: str | None = None, name: str | None = None
    ) -> SolanaAccount:
        """Get a Solana account by address.

        Args:
            address (str, optional): The address of the account.
            name (str, optional): The name of the account.

        Returns:
            SolanaAccount: The Solana account model.

        """
        if address:
            return await self.api_clients.solana_accounts.get_solana_account(address)
        elif name:
            return await self.api_clients.solana_accounts.get_solana_account_by_name(name)
        else:
            raise ValueError("Either address or name must be provided")

    async def get_or_create_account(
        self,
        name: str | None = None,
    ) -> SolanaAccount:
        """Get a Solana account, or create one if it doesn't exist.

        Args:
            name (str, optional): The name of the account to get or create.

        Returns:
            SolanaAccount: The Solana account model.

        """
        try:
            account = await self.get_account(name=name)
            return account
        except ApiError as e:
            if e.http_code == 404:
                try:
                    account = await self.create_account(name=name)
                    return account
                except ApiError as e:
                    if e.http_code == 409:
                        account = await self.get_account(name=name)
                        return account
                    raise e
            raise e

    async def list_accounts(
        self,
        page_size: int | None = None,
        page_token: str | None = None,
    ) -> ListSolanaAccountsResponse:
        """List all Solana accounts.

        Args:
            page_size (int, optional): The number of accounts to return per page. Defaults to None.
            page_token (str, optional): The token for the next page of accounts, if any. Defaults to None.

        Returns:
            ListSolanaAccountsResponse: The list of Solana accounts, and an optional next page token.

        """
        return await self.api_clients.solana_accounts.list_solana_accounts(
            page_size=page_size, page_token=page_token
        )

    async def sign_message(
        self, address: str, message: str, idempotency_key: str | None = None
    ) -> SignSolanaMessageResponse:
        """Sign a Solana message.

        Args:
            address (str): The address of the account.
            message (str): The message to sign.
            idempotency_key (str, optional): The idempotency key. Defaults to None.

        Returns:
            SignSolanaMessageResponse: The response containing the signature.

        """
        return await self.api_clients.solana_accounts.sign_solana_message(
            address=address,
            sign_solana_message_request=SignSolanaMessageRequest(message=message),
            x_idempotency_key=idempotency_key,
        )

    async def sign_transaction(
        self, address: str, transaction: str, idempotency_key: str | None = None
    ) -> SignSolanaTransactionResponse:
        """Sign a Solana transaction.

        Args:
            address (str): The address of the account.
            transaction (str): The transaction to sign.
            idempotency_key (str, optional): The idempotency key. Defaults to None.

        Returns:
            SignSolanaTransactionResponse: The response containing the signed transaction.

        """
        return await self.api_clients.solana_accounts.sign_solana_transaction(
            address=address,
            sign_solana_transaction_request=SignSolanaTransactionRequest(transaction=transaction),
            x_idempotency_key=idempotency_key,
        )

    async def request_faucet(
        self,
        address: str,
        token: str,
    ) -> RequestSolanaFaucetResponse:
        """Request a token from the faucet.

        Args:
            address (str): The address to request the faucet for.
            token (str): The token to request the faucet for.

        Returns:
            RequestSolanaFaucetResponse: The response containing the transaction hash.

        """
        return await self.api_clients.faucets.request_solana_faucet(
            request_solana_faucet_request=RequestSolanaFaucetRequest(address=address, token=token)
        )
