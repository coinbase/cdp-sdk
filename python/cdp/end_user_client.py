import base64
import re
import uuid
from typing import Literal

import base58
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.primitives.serialization import load_pem_public_key

from cdp.analytics import track_action
from cdp.api_clients import ApiClients
from cdp.constants import ImportAccountPublicRSAKey
from cdp.end_user_account import EndUserAccount
from cdp.errors import UserInputValidationError
from cdp.openapi_client.models.add_end_user_evm_account201_response import (
    AddEndUserEvmAccount201Response,
)
from cdp.openapi_client.models.add_end_user_evm_smart_account201_response import (
    AddEndUserEvmSmartAccount201Response,
)
from cdp.openapi_client.models.add_end_user_evm_smart_account_request import (
    AddEndUserEvmSmartAccountRequest,
)
from cdp.openapi_client.models.add_end_user_solana_account201_response import (
    AddEndUserSolanaAccount201Response,
)
from cdp.openapi_client.models.authentication_method import AuthenticationMethod
from cdp.openapi_client.models.create_end_user_request import CreateEndUserRequest
from cdp.openapi_client.models.create_end_user_request_evm_account import (
    CreateEndUserRequestEvmAccount,
)
from cdp.openapi_client.models.create_end_user_request_solana_account import (
    CreateEndUserRequestSolanaAccount,
)
from cdp.openapi_client.models.import_end_user_request import ImportEndUserRequest
from cdp.openapi_client.models.validate_end_user_access_token_request import (
    ValidateEndUserAccessTokenRequest,
)


class ListEndUsersResult:
    """Result of listing end users.

    Attributes:
        end_users (List[EndUserAccount]): The list of end users.
        next_page_token (str | None): The token for the next page of end users, if any.

    """

    def __init__(self, end_users: list[EndUserAccount], next_page_token: str | None = None):
        self.end_users = end_users
        self.next_page_token = next_page_token


class EndUserClient:
    """The EndUserClient class is responsible for CDP API calls for the end user."""

    def __init__(self, api_clients: ApiClients):
        self.api_clients = api_clients

    async def create_end_user(
        self,
        authentication_methods: list[AuthenticationMethod],
        user_id: str | None = None,
        evm_account: CreateEndUserRequestEvmAccount | None = None,
        solana_account: CreateEndUserRequestSolanaAccount | None = None,
    ) -> EndUserAccount:
        """Create an end user.

        An end user is an entity that can own CDP EVM accounts, EVM smart accounts,
        and/or Solana accounts.

        Args:
            authentication_methods: The list of authentication methods for the end user.
            user_id: Optional unique identifier for the end user. If not provided, a UUID is generated.
            evm_account: Optional configuration for creating an EVM account for the end user.
            solana_account: Optional configuration for creating a Solana account for the end user.

        Returns:
            EndUserAccount: The created end user with action methods.

        """
        track_action(action="create_end_user")

        # Generate UUID if user_id not provided
        if user_id is None:
            user_id = str(uuid.uuid4())

        end_user = await self.api_clients.end_user.create_end_user(
            create_end_user_request=CreateEndUserRequest(
                user_id=user_id,
                authentication_methods=authentication_methods,
                evm_account=evm_account,
                solana_account=solana_account,
            ),
        )

        return EndUserAccount(end_user, self.api_clients)

    async def list_end_users(
        self,
        page_size: int | None = None,
        page_token: str | None = None,
        sort: list[str] | None = None,
    ) -> ListEndUsersResult:
        """List end users belonging to the developer's CDP Project.

        Args:
            page_size (int | None, optional): The number of end users to return per page. Defaults to None.
            page_token (str | None, optional): The token for the desired page of end users. Defaults to None.
            sort (List[str] | None, optional): Sort end users. Defaults to ascending order (oldest first). Defaults to None.

        Returns:
            ListEndUsersResult: A paginated list of end users with action methods.

        """
        track_action(action="list_end_users")

        response = await self.api_clients.end_user.list_end_users(
            page_size=page_size,
            page_token=page_token,
            sort=sort,
        )

        end_user_accounts = [
            EndUserAccount(end_user, self.api_clients) for end_user in response.end_users
        ]

        return ListEndUsersResult(
            end_users=end_user_accounts,
            next_page_token=response.next_page_token,
        )

    async def validate_access_token(
        self,
        access_token: str,
    ):
        """Validate an end user's access token.

        Args:
            access_token (str): The access token to validate.

        """
        track_action(action="validate_access_token")

        return await self.api_clients.end_user.validate_end_user_access_token(
            validate_end_user_access_token_request=ValidateEndUserAccessTokenRequest(
                access_token=access_token,
            ),
        )

    async def import_end_user(
        self,
        authentication_methods: list[AuthenticationMethod],
        private_key: str | bytes,
        key_type: Literal["evm", "solana"],
        user_id: str | None = None,
        encryption_public_key: str | None = None,
    ) -> EndUserAccount:
        """Import an existing private key for an end user.

        Args:
            authentication_methods: The list of authentication methods for the end user.
            private_key: The private key to import.
                - For EVM: hex string (with or without 0x prefix)
                - For Solana: base58 encoded string or raw bytes (32 or 64 bytes)
            key_type: The type of key being imported ("evm" or "solana").
            user_id: Optional unique identifier for the end user. If not provided, a UUID is generated.
            encryption_public_key: Optional RSA public key to encrypt the private key.
                Defaults to the known CDP public key.

        Returns:
            EndUserAccount: The imported end user with action methods.

        Raises:
            UserInputValidationError: If the private key format is invalid.

        """
        track_action(action="import_end_user")

        # Generate UUID if user_id not provided
        if user_id is None:
            user_id = str(uuid.uuid4())

        if key_type == "evm":
            # EVM: expect hex string (with or without 0x prefix)
            if not isinstance(private_key, str):
                raise UserInputValidationError("EVM private key must be a hex string")

            private_key_hex = private_key[2:] if private_key.startswith("0x") else private_key
            if not re.match(r"^[0-9a-fA-F]+$", private_key_hex):
                raise UserInputValidationError("Private key must be a valid hexadecimal string")

            private_key_bytes = bytes.fromhex(private_key_hex)
        else:
            # Solana: expect base58 string or raw bytes (32 or 64 bytes)
            if isinstance(private_key, str):
                try:
                    private_key_bytes = base58.b58decode(private_key)
                except Exception as e:
                    raise UserInputValidationError(
                        "Private key must be a valid base58 encoded string"
                    ) from e
            else:
                private_key_bytes = private_key

            if len(private_key_bytes) not in (32, 64):
                raise UserInputValidationError("Solana private key must be 32 or 64 bytes")

            # Truncate 64-byte keys to 32 bytes (seed only)
            if len(private_key_bytes) == 64:
                private_key_bytes = private_key_bytes[:32]

        # Encrypt the private key
        try:
            key_to_use = (
                encryption_public_key if encryption_public_key else ImportAccountPublicRSAKey
            )
            public_key = load_pem_public_key(key_to_use.encode())
            encrypted_private_key = public_key.encrypt(
                private_key_bytes,
                padding.OAEP(
                    mgf=padding.MGF1(algorithm=hashes.SHA256()),
                    algorithm=hashes.SHA256(),
                    label=None,
                ),
            )
            encrypted_private_key_b64 = base64.b64encode(encrypted_private_key).decode("utf-8")
        except Exception as e:
            raise ValueError(f"Failed to encrypt private key: {e}") from e

        end_user = await self.api_clients.end_user.import_end_user(
            import_end_user_request=ImportEndUserRequest(
                user_id=user_id,
                authentication_methods=authentication_methods,
                encrypted_private_key=encrypted_private_key_b64,
                key_type=key_type,
            ),
        )

        return EndUserAccount(end_user, self.api_clients)

    async def add_end_user_evm_account(
        self,
        user_id: str,
    ) -> AddEndUserEvmAccount201Response:
        """Add an EVM EOA (Externally Owned Account) to an existing end user.

        End users can have up to 10 EVM accounts.

        Args:
            user_id: The unique identifier of the end user.

        Returns:
            AddEndUserEvmAccount201Response: The result containing the newly created EVM EOA account.

        """
        track_action(action="add_end_user_evm_account")

        return await self.api_clients.end_user.add_end_user_evm_account(
            user_id=user_id,
            body={},
        )

    async def add_end_user_evm_smart_account(
        self,
        user_id: str,
        enable_spend_permissions: bool,
    ) -> AddEndUserEvmSmartAccount201Response:
        """Add an EVM smart account to an existing end user.

        This also creates a new EVM EOA account to serve as the owner of the smart account.

        Args:
            user_id: The unique identifier of the end user.
            enable_spend_permissions: If true, enables spend permissions for the EVM smart account.

        Returns:
            AddEndUserEvmSmartAccount201Response: The result containing the newly created EVM smart account.

        """
        track_action(action="add_end_user_evm_smart_account")

        return await self.api_clients.end_user.add_end_user_evm_smart_account(
            user_id=user_id,
            add_end_user_evm_smart_account_request=AddEndUserEvmSmartAccountRequest(
                enable_spend_permissions=enable_spend_permissions,
            ),
        )

    async def add_end_user_solana_account(
        self,
        user_id: str,
    ) -> AddEndUserSolanaAccount201Response:
        """Add a Solana account to an existing end user.

        End users can have up to 10 Solana accounts.

        Args:
            user_id: The unique identifier of the end user.

        Returns:
            AddEndUserSolanaAccount201Response: The result containing the newly created Solana account.

        """
        track_action(action="add_end_user_solana_account")

        return await self.api_clients.end_user.add_end_user_solana_account(
            user_id=user_id,
            body={},
        )
