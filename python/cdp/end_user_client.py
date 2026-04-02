import base64
import os
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
from cdp.openapi_client.models.create_evm_eip7702_delegation201_response import (
    CreateEvmEip7702Delegation201Response,
)
from cdp.openapi_client.models.create_evm_eip7702_delegation_with_end_user_account_request import (
    CreateEvmEip7702DelegationWithEndUserAccountRequest,
)
from cdp.openapi_client.models.evm_user_operation import EvmUserOperation
from cdp.openapi_client.models.import_end_user_request import ImportEndUserRequest
from cdp.openapi_client.models.revoke_delegation_for_end_user_request import (
    RevokeDelegationForEndUserRequest,
)
from cdp.openapi_client.models.send_evm_asset_with_end_user_account200_response import (
    SendEvmAssetWithEndUserAccount200Response,
)
from cdp.openapi_client.models.send_evm_asset_with_end_user_account_request import (
    SendEvmAssetWithEndUserAccountRequest,
)
from cdp.openapi_client.models.send_evm_transaction200_response import (
    SendEvmTransaction200Response,
)
from cdp.openapi_client.models.send_evm_transaction_with_end_user_account_request import (
    SendEvmTransactionWithEndUserAccountRequest,
)
from cdp.openapi_client.models.send_solana_asset_with_end_user_account200_response import (
    SendSolanaAssetWithEndUserAccount200Response,
)
from cdp.openapi_client.models.send_solana_asset_with_end_user_account_request import (
    SendSolanaAssetWithEndUserAccountRequest,
)
from cdp.openapi_client.models.send_solana_transaction200_response import (
    SendSolanaTransaction200Response,
)
from cdp.openapi_client.models.send_solana_transaction_with_end_user_account_request import (
    SendSolanaTransactionWithEndUserAccountRequest,
)
from cdp.openapi_client.models.send_user_operation_with_end_user_account_request import (
    SendUserOperationWithEndUserAccountRequest,
)
from cdp.openapi_client.models.sign_evm_hash200_response import SignEvmHash200Response
from cdp.openapi_client.models.sign_evm_hash_with_end_user_account_request import (
    SignEvmHashWithEndUserAccountRequest,
)
from cdp.openapi_client.models.sign_evm_message200_response import SignEvmMessage200Response
from cdp.openapi_client.models.sign_evm_message_with_end_user_account_request import (
    SignEvmMessageWithEndUserAccountRequest,
)
from cdp.openapi_client.models.sign_evm_transaction200_response import (
    SignEvmTransaction200Response,
)
from cdp.openapi_client.models.sign_evm_transaction_with_end_user_account_request import (
    SignEvmTransactionWithEndUserAccountRequest,
)
from cdp.openapi_client.models.sign_evm_typed_data200_response import SignEvmTypedData200Response
from cdp.openapi_client.models.sign_evm_typed_data_with_end_user_account_request import (
    SignEvmTypedDataWithEndUserAccountRequest,
)
from cdp.openapi_client.models.sign_solana_hash_with_end_user_account200_response import (
    SignSolanaHashWithEndUserAccount200Response,
)
from cdp.openapi_client.models.sign_solana_hash_with_end_user_account_request import (
    SignSolanaHashWithEndUserAccountRequest,
)
from cdp.openapi_client.models.sign_solana_message200_response import SignSolanaMessage200Response
from cdp.openapi_client.models.sign_solana_message_with_end_user_account_request import (
    SignSolanaMessageWithEndUserAccountRequest,
)
from cdp.openapi_client.models.sign_solana_transaction200_response import (
    SignSolanaTransaction200Response,
)
from cdp.openapi_client.models.sign_solana_transaction_with_end_user_account_request import (
    SignSolanaTransactionWithEndUserAccountRequest,
)
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
    """The EndUserClient class is responsible for CDP API calls for the end user.

    Delegation operations (signing, sending, EIP-7702 delegation) require a project ID
    to be configured. Set the CDP_PROJECT_ID environment variable or pass it when
    constructing the CdpClient.
    """

    def __init__(self, api_clients: ApiClients, project_id: str | None = None):
        self.api_clients = api_clients
        self._project_id = project_id or os.getenv("CDP_PROJECT_ID")

    def _require_project_id(self) -> str:
        """Return the configured project ID or raise if not set."""
        if not self._project_id:
            raise ValueError(
                "Project ID not configured. Delegated end-user operations require a project ID. "
                "Set the CDP_PROJECT_ID environment variable, or pass project_id to CdpClient."
            )
        return self._project_id

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

        return EndUserAccount(end_user, self.api_clients, self._project_id)

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
            EndUserAccount(end_user, self.api_clients, self._project_id)
            for end_user in response.end_users
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

        return EndUserAccount(end_user, self.api_clients, self._project_id)

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

    async def get_end_user(
        self,
        user_id: str,
    ) -> EndUserAccount:
        """Get an end user by their unique identifier.

        Args:
            user_id: The unique identifier of the end user.

        Returns:
            EndUserAccount: The end user with action methods.

        """
        track_action(action="get_end_user")

        project_id = self._require_project_id()
        end_user = await self.api_clients.end_user.get_end_user(
            project_id=project_id,
            user_id=user_id,
        )

        return EndUserAccount(end_user, self.api_clients, self._project_id)

    # ==================== Delegated EVM Sign Operations ====================

    async def sign_evm_hash(
        self,
        user_id: str,
        hash: str,
        address: str,
    ) -> SignEvmHash200Response:
        """Sign an EVM hash on behalf of an end user using a delegation.

        Requires the end user to have created a delegation allowing the developer
        to sign on their behalf.

        Args:
            user_id: The unique identifier of the end user.
            hash: The 32-byte hash to sign (0x-prefixed hex).
            address: The 0x-prefixed EVM address to sign with.

        Returns:
            SignEvmHash200Response: The signature response.

        """
        track_action(action="sign_evm_hash_end_user")

        project_id = self._require_project_id()
        return await self.api_clients.embedded_wallets_core.sign_evm_hash_with_end_user_account(
            project_id=project_id,
            user_id=user_id,
            sign_evm_hash_with_end_user_account_request=SignEvmHashWithEndUserAccountRequest(
                hash=hash,
                address=address,
            ),
        )

    async def sign_evm_message(
        self,
        user_id: str,
        address: str,
        message: str,
    ) -> SignEvmMessage200Response:
        """Sign an EIP-191 message on behalf of an end user using a delegation.

        Requires the end user to have created a delegation allowing the developer
        to sign on their behalf.

        Args:
            user_id: The unique identifier of the end user.
            address: The 0x-prefixed EVM address to sign with.
            message: The plaintext message to sign.

        Returns:
            SignEvmMessage200Response: The signature response.

        """
        track_action(action="sign_evm_message_end_user")

        project_id = self._require_project_id()
        return await self.api_clients.embedded_wallets_core.sign_evm_message_with_end_user_account(
            project_id=project_id,
            user_id=user_id,
            sign_evm_message_with_end_user_account_request=SignEvmMessageWithEndUserAccountRequest(
                message=message,
                address=address,
            ),
        )

    async def sign_evm_transaction(
        self,
        user_id: str,
        address: str,
        transaction: str,
    ) -> SignEvmTransaction200Response:
        """Sign an EVM transaction on behalf of an end user using a delegation.

        Requires the end user to have created a delegation allowing the developer
        to sign on their behalf.

        Args:
            user_id: The unique identifier of the end user.
            address: The 0x-prefixed EVM address to sign with.
            transaction: The RLP-encoded unsigned EIP-1559 transaction (0x-prefixed hex).

        Returns:
            SignEvmTransaction200Response: The signed transaction response.

        """
        track_action(action="sign_evm_transaction_end_user")

        project_id = self._require_project_id()
        return await self.api_clients.embedded_wallets_core.sign_evm_transaction_with_end_user_account(
            project_id=project_id,
            user_id=user_id,
            sign_evm_transaction_with_end_user_account_request=SignEvmTransactionWithEndUserAccountRequest(
                transaction=transaction,
                address=address,
            ),
        )

    async def sign_evm_typed_data(
        self,
        user_id: str,
        address: str,
        typed_data: dict,
    ) -> SignEvmTypedData200Response:
        """Sign EIP-712 typed data on behalf of an end user using a delegation.

        Requires the end user to have created a delegation allowing the developer
        to sign on their behalf.

        Args:
            user_id: The unique identifier of the end user.
            address: The 0x-prefixed EVM address to sign with.
            typed_data: The EIP-712 typed data structure.

        Returns:
            SignEvmTypedData200Response: The signature response.

        """
        track_action(action="sign_evm_typed_data_end_user")

        project_id = self._require_project_id()
        return await self.api_clients.embedded_wallets_core.sign_evm_typed_data_with_end_user_account(
            project_id=project_id,
            user_id=user_id,
            sign_evm_typed_data_with_end_user_account_request=SignEvmTypedDataWithEndUserAccountRequest(
                typed_data_hash=typed_data,
                address=address,
            ),
        )

    # ==================== Delegated EVM Send Operations ====================

    async def send_evm_transaction(
        self,
        user_id: str,
        address: str,
        transaction: str,
        network: str,
    ) -> SendEvmTransaction200Response:
        """Send an EVM transaction on behalf of an end user using a delegation.

        Signs and broadcasts the transaction. Requires the end user to have created
        a delegation allowing the developer to sign on their behalf.

        Args:
            user_id: The unique identifier of the end user.
            address: The 0x-prefixed EVM address to send from.
            transaction: The RLP-encoded unsigned EIP-1559 transaction (0x-prefixed hex).
            network: The target EVM network (e.g. "base-sepolia", "base").

        Returns:
            SendEvmTransaction200Response: The transaction hash response.

        """
        track_action(action="send_evm_transaction_end_user")

        project_id = self._require_project_id()
        return await self.api_clients.embedded_wallets_core.send_evm_transaction_with_end_user_account(
            project_id=project_id,
            user_id=user_id,
            send_evm_transaction_with_end_user_account_request=SendEvmTransactionWithEndUserAccountRequest(
                transaction=transaction,
                address=address,
                network=network,
            ),
        )

    async def send_evm_asset(
        self,
        user_id: str,
        address: str,
        to: str,
        amount: str,
        network: str,
        asset: str = "usdc",
        use_cdp_paymaster: bool | None = None,
        paymaster_url: str | None = None,
    ) -> SendEvmAssetWithEndUserAccount200Response:
        """Send an EVM asset (e.g. USDC) on behalf of an end user using a delegation.

        Requires the end user to have created a delegation allowing the developer
        to sign on their behalf.

        Args:
            user_id: The unique identifier of the end user.
            address: The 0x-prefixed EVM address to send from.
            to: The recipient address.
            amount: The amount to send (e.g. "1000000" for 1 USDC with 6 decimals).
            network: The target EVM network (e.g. "base-sepolia", "base").
            asset: The asset to send. Defaults to "usdc".
            use_cdp_paymaster: Whether to use CDP paymaster for gas sponsorship (smart accounts).
            paymaster_url: Optional custom paymaster URL.

        Returns:
            SendEvmAssetWithEndUserAccount200Response: The transaction/user-op hash response.

        """
        track_action(action="send_evm_asset_end_user")

        project_id = self._require_project_id()
        request = SendEvmAssetWithEndUserAccountRequest(
            to=to,
            amount=amount,
            network=network,
        )
        if use_cdp_paymaster is not None:
            request.use_cdp_paymaster = use_cdp_paymaster
        if paymaster_url is not None:
            request.paymaster_url = paymaster_url

        return await self.api_clients.embedded_wallets_core.send_evm_asset_with_end_user_account(
            project_id=project_id,
            user_id=user_id,
            address=address,
            asset=asset,
            send_evm_asset_with_end_user_account_request=request,
        )

    async def send_user_operation(
        self,
        user_id: str,
        address: str,
        network: str,
        calls: list[dict],
        use_cdp_paymaster: bool = True,
        paymaster_url: str | None = None,
        data_suffix: str | None = None,
    ) -> EvmUserOperation:
        """Send a user operation for an end user's Smart Account (ERC-4337).

        Requires the end user to have created a delegation allowing the developer
        to sign on their behalf.

        Args:
            user_id: The unique identifier of the end user.
            address: The EVM smart account address.
            network: The target EVM network (e.g. "base-sepolia", "base").
            calls: Array of call objects, each with "to", "value", and "data" keys.
            use_cdp_paymaster: Whether to use CDP paymaster. Defaults to True.
            paymaster_url: Optional custom paymaster URL.
            data_suffix: Optional hex data suffix appended to calldata.

        Returns:
            EvmUserOperation: The user operation result.

        """
        track_action(action="send_user_operation_end_user")

        project_id = self._require_project_id()
        request = SendUserOperationWithEndUserAccountRequest(
            network=network,
            calls=calls,
            use_cdp_paymaster=use_cdp_paymaster,
        )
        if paymaster_url is not None:
            request.paymaster_url = paymaster_url
        if data_suffix is not None:
            request.data_suffix = data_suffix

        return (
            await self.api_clients.embedded_wallets_core.send_user_operation_with_end_user_account(
                project_id=project_id,
                user_id=user_id,
                address=address,
                send_user_operation_with_end_user_account_request=request,
            )
        )

    # ==================== Delegated Solana Sign Operations ====================

    async def sign_solana_hash(
        self,
        user_id: str,
        hash: str,
        address: str,
    ) -> SignSolanaHashWithEndUserAccount200Response:
        """Sign a Solana hash on behalf of an end user using a delegation.

        Requires the end user to have created a delegation allowing the developer
        to sign on their behalf.

        Args:
            user_id: The unique identifier of the end user.
            hash: The base58-encoded 32-byte hash.
            address: The Solana address to sign with.

        Returns:
            SignSolanaHashWithEndUserAccount200Response: The signature response.

        """
        track_action(action="sign_solana_hash_end_user")

        project_id = self._require_project_id()
        return await self.api_clients.embedded_wallets_core.sign_solana_hash_with_end_user_account(
            project_id=project_id,
            user_id=user_id,
            sign_solana_hash_with_end_user_account_request=SignSolanaHashWithEndUserAccountRequest(
                hash=hash,
                address=address,
            ),
        )

    async def sign_solana_message(
        self,
        user_id: str,
        address: str,
        message: str,
    ) -> SignSolanaMessage200Response:
        """Sign a Solana message on behalf of an end user using a delegation.

        Requires the end user to have created a delegation allowing the developer
        to sign on their behalf.

        Args:
            user_id: The unique identifier of the end user.
            address: The Solana address to sign with.
            message: The base64-encoded message to sign.

        Returns:
            SignSolanaMessage200Response: The signature response.

        """
        track_action(action="sign_solana_message_end_user")

        project_id = self._require_project_id()
        return await self.api_clients.embedded_wallets_core.sign_solana_message_with_end_user_account(
            project_id=project_id,
            user_id=user_id,
            sign_solana_message_with_end_user_account_request=SignSolanaMessageWithEndUserAccountRequest(
                message=message,
                address=address,
            ),
        )

    async def sign_solana_transaction(
        self,
        user_id: str,
        address: str,
        transaction: str,
    ) -> SignSolanaTransaction200Response:
        """Sign a Solana transaction on behalf of an end user using a delegation.

        Requires the end user to have created a delegation allowing the developer
        to sign on their behalf.

        Args:
            user_id: The unique identifier of the end user.
            address: The Solana address to sign with.
            transaction: The base64-encoded unsigned Solana transaction.

        Returns:
            SignSolanaTransaction200Response: The signed transaction response.

        """
        track_action(action="sign_solana_transaction_end_user")

        project_id = self._require_project_id()
        return await self.api_clients.embedded_wallets_core.sign_solana_transaction_with_end_user_account(
            project_id=project_id,
            user_id=user_id,
            sign_solana_transaction_with_end_user_account_request=SignSolanaTransactionWithEndUserAccountRequest(
                transaction=transaction,
                address=address,
            ),
        )

    # ==================== Delegated Solana Send Operations ====================

    async def send_solana_transaction(
        self,
        user_id: str,
        address: str,
        transaction: str,
        network: str,
    ) -> SendSolanaTransaction200Response:
        """Send a Solana transaction on behalf of an end user using a delegation.

        Signs and broadcasts the transaction. Requires the end user to have created
        a delegation allowing the developer to sign on their behalf.

        Args:
            user_id: The unique identifier of the end user.
            address: The Solana address to send from.
            transaction: The base64-encoded unsigned Solana transaction.
            network: The target Solana network (e.g. "solana-devnet", "solana").

        Returns:
            SendSolanaTransaction200Response: The transaction signature response.

        """
        track_action(action="send_solana_transaction_end_user")

        project_id = self._require_project_id()
        return await self.api_clients.embedded_wallets_core.send_solana_transaction_with_end_user_account(
            project_id=project_id,
            user_id=user_id,
            send_solana_transaction_with_end_user_account_request=SendSolanaTransactionWithEndUserAccountRequest(
                transaction=transaction,
                address=address,
                network=network,
            ),
        )

    async def send_solana_asset(
        self,
        user_id: str,
        address: str,
        to: str,
        amount: str,
        network: str,
        asset: str = "usdc",
    ) -> SendSolanaAssetWithEndUserAccount200Response:
        """Send a Solana asset (e.g. USDC) on behalf of an end user using a delegation.

        Requires the end user to have created a delegation allowing the developer
        to sign on their behalf.

        Args:
            user_id: The unique identifier of the end user.
            address: The Solana address to send from.
            to: The recipient address.
            amount: The amount to send.
            network: The target Solana network (e.g. "solana-devnet", "solana").
            asset: The asset to send. Defaults to "usdc".

        Returns:
            SendSolanaAssetWithEndUserAccount200Response: The transaction signature response.

        """
        track_action(action="send_solana_asset_end_user")

        project_id = self._require_project_id()
        return await self.api_clients.embedded_wallets_core.send_solana_asset_with_end_user_account(
            project_id=project_id,
            user_id=user_id,
            address=address,
            asset=asset,
            send_solana_asset_with_end_user_account_request=SendSolanaAssetWithEndUserAccountRequest(
                to=to,
                amount=amount,
                network=network,
            ),
        )

    # ==================== Delegation Lifecycle ====================

    async def create_evm_eip7702_delegation(
        self,
        user_id: str,
        address: str,
        network: str,
        enable_spend_permissions: bool = False,
    ) -> CreateEvmEip7702Delegation201Response:
        """Create an EIP-7702 delegation for an end user's EVM account.

        Upgrades an EVM EOA with smart account capabilities. Requires the end user
        to have created a delegation allowing the developer to sign on their behalf.

        Args:
            user_id: The unique identifier of the end user.
            address: The 0x-prefixed EVM address to delegate.
            network: The target EVM network (e.g. "base-sepolia", "base").
            enable_spend_permissions: Whether to enable spend permissions. Defaults to False.

        Returns:
            CreateEvmEip7702Delegation201Response: The delegation operation ID.

        """
        track_action(action="create_evm_eip7702_delegation_end_user")

        project_id = self._require_project_id()
        return await self.api_clients.embedded_wallets_core.create_evm_eip7702_delegation_with_end_user_account(
            project_id=project_id,
            user_id=user_id,
            create_evm_eip7702_delegation_with_end_user_account_request=CreateEvmEip7702DelegationWithEndUserAccountRequest(
                address=address,
                network=network,
                enable_spend_permissions=enable_spend_permissions,
            ),
        )

    async def revoke_delegation(
        self,
        user_id: str,
    ) -> None:
        """Revoke all active delegations for an end user.

        After revocation, the developer can no longer sign on behalf of this end user
        until a new delegation is created.

        Args:
            user_id: The unique identifier of the end user.

        """
        track_action(action="revoke_delegation_end_user")

        project_id = self._require_project_id()
        await self.api_clients.embedded_wallets_core.revoke_delegation_for_end_user(
            project_id=project_id,
            user_id=user_id,
            revoke_delegation_for_end_user_request=RevokeDelegationForEndUserRequest(),
        )
