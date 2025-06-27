import base64

import base58
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.primitives.serialization import load_pem_public_key

from cdp.actions.solana.request_faucet import request_faucet
from cdp.actions.solana.sign_message import sign_message
from cdp.actions.solana.sign_transaction import sign_transaction
from cdp.analytics import wrap_class_with_error_tracking
from cdp.api_clients import ApiClients
from cdp.constants import ImportAccountPublicRSAKey
from cdp.export import (
    decrypt_with_private_key,
    format_solana_private_key,
    generate_export_encryption_key_pair,
)
from cdp.openapi_client.errors import ApiError
from cdp.openapi_client.models.create_solana_account_request import (
    CreateSolanaAccountRequest,
)
from cdp.openapi_client.models.export_evm_account_request import ExportEvmAccountRequest
from cdp.openapi_client.models.import_solana_account_request import ImportSolanaAccountRequest
from cdp.openapi_client.models.request_solana_faucet200_response import (
    RequestSolanaFaucet200Response as RequestSolanaFaucetResponse,
)
from cdp.openapi_client.models.sign_solana_message200_response import (
    SignSolanaMessage200Response as SignSolanaMessageResponse,
)
from cdp.openapi_client.models.sign_solana_transaction200_response import (
    SignSolanaTransaction200Response as SignSolanaTransactionResponse,
)
from cdp.openapi_client.models.update_solana_account_request import UpdateSolanaAccountRequest
from cdp.solana_account import ListSolanaAccountsResponse, SolanaAccount
from cdp.update_account_types import UpdateAccountOptions


class SolanaClient:
    """The SolanaClient class is responsible for CDP API calls for Solana."""

    def __init__(self, api_clients: ApiClients):
        self.api_clients = api_clients
        wrap_class_with_error_tracking(SolanaAccount)

    async def create_account(
        self,
        name: str | None = None,
        account_policy: str | None = None,
        idempotency_key: str | None = None,
    ) -> SolanaAccount:
        """Create a Solana account.

        Args:
            name (str, optional): The name. Defaults to None.
            account_policy (str, optional): The ID of the account-level policy to apply to the account. Defaults to None.
            idempotency_key (str, optional): The idempotency key. Defaults to None.

        Returns:
            SolanaAccount: The Solana account model.

        """
        response = await self.api_clients.solana_accounts.create_solana_account(
            x_idempotency_key=idempotency_key,
            create_solana_account_request=CreateSolanaAccountRequest(
                name=name,
                account_policy=account_policy,
            ),
        )

        return SolanaAccount(
            solana_account_model=response,
            api_clients=self.api_clients,
        )

    async def import_account(
        self,
        private_key: str | bytes,
        encryption_public_key: str | None = ImportAccountPublicRSAKey,
        name: str | None = None,
        idempotency_key: str | None = None,
    ) -> SolanaAccount:
        """Import a Solana account.

        Args:
            private_key (str | bytes): The private key of the account as a base58 encoded string or raw bytes.
            encryption_public_key (str, optional): The public RSA key used to encrypt the private key when importing a Solana account. Defaults to the known public key.
            name (str, optional): The name. Defaults to None.
            idempotency_key (str, optional): The idempotency key. Defaults to None.

        Returns:
            SolanaAccount: The Solana account.

        """
        # Handle both string (base58) and raw bytes input
        if isinstance(private_key, str):
            try:
                # Decode the private key from base58
                private_key_bytes = base58.b58decode(private_key)
            except Exception:
                raise ValueError("Private key must be a valid base58 encoded string") from None
        else:
            # private_key is already bytes
            private_key_bytes = private_key

        if len(private_key_bytes) != 32 and len(private_key_bytes) != 64:
            raise ValueError("Private key must be 32 or 64 bytes")

        if len(private_key_bytes) == 64:
            private_key_bytes = private_key_bytes[0:32]

        try:
            public_key = load_pem_public_key(encryption_public_key.encode())
            encrypted_private_key = public_key.encrypt(
                private_key_bytes,
                padding.OAEP(
                    mgf=padding.MGF1(algorithm=hashes.SHA256()),
                    algorithm=hashes.SHA256(),
                    label=None,
                ),
            )
            encrypted_private_key = base64.b64encode(encrypted_private_key).decode("utf-8")
            solana_account = await self.api_clients.solana_accounts.import_solana_account(
                import_solana_account_request=ImportSolanaAccountRequest(
                    encrypted_private_key=encrypted_private_key,
                    name=name,
                ),
                x_idempotency_key=idempotency_key,
            )
            return SolanaAccount(solana_account, self.api_clients)
        except ApiError as e:
            raise e
        except Exception as e:
            raise ValueError(f"Failed to import account: {e}") from e

    async def export_account(
        self,
        address: str | None = None,
        name: str | None = None,
        idempotency_key: str | None = None,
    ) -> str:
        """Export a Solana account.

        Args:
            address (str, optional): The address of the account.
            name (str, optional): The name of the account.
            idempotency_key (str, optional): The idempotency key.

        Returns:
            str: The decrypted private key which is a base58 encoding of the account's full 64-byte private key.

        Raises:
            ValueError: If neither address nor name is provided.

        """
        public_key, private_key = generate_export_encryption_key_pair()

        if address:
            response = await self.api_clients.solana_accounts.export_solana_account(
                address=address,
                export_evm_account_request=ExportEvmAccountRequest(
                    export_encryption_key=public_key,
                ),
                x_idempotency_key=idempotency_key,
            )
            decrypted_private_key = decrypt_with_private_key(
                private_key, response.encrypted_private_key
            )
            return format_solana_private_key(decrypted_private_key)

        if name:
            response = await self.api_clients.solana_accounts.export_solana_account_by_name(
                name=name,
                export_evm_account_request=ExportEvmAccountRequest(
                    export_encryption_key=public_key,
                ),
                x_idempotency_key=idempotency_key,
            )
            decrypted_private_key = decrypt_with_private_key(
                private_key, response.encrypted_private_key
            )
            return format_solana_private_key(decrypted_private_key)

        raise ValueError("Either address or name must be provided")

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
            response = await self.api_clients.solana_accounts.get_solana_account(address)
        elif name:
            response = await self.api_clients.solana_accounts.get_solana_account_by_name(name)
        else:
            raise ValueError("Either address or name must be provided")

        return SolanaAccount(
            solana_account_model=response,
            api_clients=self.api_clients,
        )

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
        response = await self.api_clients.solana_accounts.list_solana_accounts(
            page_size=page_size, page_token=page_token
        )

        accounts = [
            SolanaAccount(
                solana_account_model=account,
                api_clients=self.api_clients,
            )
            for account in response.accounts
        ]

        return ListSolanaAccountsResponse(
            accounts=accounts,
            next_page_token=response.next_page_token,
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
        return await sign_message(
            self.api_clients.solana_accounts,
            address,
            message,
            idempotency_key,
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
        return await sign_transaction(
            self.api_clients.solana_accounts,
            address,
            transaction,
            idempotency_key,
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
        return await request_faucet(
            self.api_clients.faucets,
            address,
            token,
        )

    async def update_account(
        self, address: str, update: UpdateAccountOptions, idempotency_key: str | None = None
    ) -> SolanaAccount:
        """Update a Solana account.

        Args:
            address (str): The address of the account.
            update (UpdateAccountOptions): The updates to apply to the account.
            idempotency_key (str, optional): The idempotency key. Defaults to None.

        Returns:
            SolanaAccount: The updated Solana account.

        """
        response = await self.api_clients.solana_accounts.update_solana_account(
            address=address,
            update_solana_account_request=UpdateSolanaAccountRequest(
                name=update.name, account_policy=update.account_policy
            ),
            x_idempotency_key=idempotency_key,
        )

        return SolanaAccount(
            solana_account_model=response,
            api_clients=self.api_clients,
        )
