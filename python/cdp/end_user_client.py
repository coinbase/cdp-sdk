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
from cdp.openapi_client.models.create_evm_eip7702_delegation_with_end_user_account201_response import (
    CreateEvmEip7702DelegationWithEndUserAccount201Response,
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
from cdp.openapi_client.models.send_evm_transaction_with_end_user_account200_response import (
    SendEvmTransactionWithEndUserAccount200Response,
)
from cdp.openapi_client.models.send_evm_transaction_with_end_user_account_request import (
    SendEvmTransactionWithEndUserAccountRequest,
)
from cdp.openapi_client.models.send_solana_asset_with_end_user_account_request import (
    SendSolanaAssetWithEndUserAccountRequest,
)
from cdp.openapi_client.models.send_solana_transaction_with_end_user_account200_response import (
    SendSolanaTransactionWithEndUserAccount200Response,
)
from cdp.openapi_client.models.send_solana_transaction_with_end_user_account_request import (
    SendSolanaTransactionWithEndUserAccountRequest,
)
from cdp.openapi_client.models.send_user_operation_with_end_user_account_request import (
    SendUserOperationWithEndUserAccountRequest,
)
from cdp.openapi_client.models.sign_evm_message_with_end_user_account200_response import (
    SignEvmMessageWithEndUserAccount200Response,
)
from cdp.openapi_client.models.sign_evm_message_with_end_user_account_request import (
    SignEvmMessageWithEndUserAccountRequest,
)
from cdp.openapi_client.models.sign_evm_transaction_with_end_user_account200_response import (
    SignEvmTransactionWithEndUserAccount200Response,
)
from cdp.openapi_client.models.sign_evm_transaction_with_end_user_account_request import (
    SignEvmTransactionWithEndUserAccountRequest,
)
from cdp.openapi_client.models.sign_evm_typed_data_with_end_user_account200_response import (
    SignEvmTypedDataWithEndUserAccount200Response,
)
from cdp.openapi_client.models.sign_evm_typed_data_with_end_user_account_request import (
    SignEvmTypedDataWithEndUserAccountRequest,
)
from cdp.openapi_client.models.sign_solana_message_with_end_user_account200_response import (
    SignSolanaMessageWithEndUserAccount200Response,
)
from cdp.openapi_client.models.sign_solana_message_with_end_user_account_request import (
    SignSolanaMessageWithEndUserAccountRequest,
)
from cdp.openapi_client.models.sign_solana_transaction_with_end_user_account200_response import (
    SignSolanaTransactionWithEndUserAccount200Response,
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

    # ─── Delegation Management ───

    async def revoke_delegation(
        self,
        user_id: str,
    ) -> None:
        """Revoke all active delegations for an end user.

        This operation can be performed by the end user themselves or by a developer
        using their API key.

        Args:
            user_id: The unique identifier of the end user.

        """
        track_action(action="revoke_delegation_for_end_user")

        await self.api_clients.embedded_wallets.revoke_delegation_for_end_user(
            user_id=user_id,
            revoke_delegation_for_end_user_request=RevokeDelegationForEndUserRequest(),
        )

    # ─── Delegated EVM Sign Methods ───

    async def sign_evm_transaction(
        self,
        user_id: str,
        address: str,
        transaction: str,
    ) -> SignEvmTransactionWithEndUserAccount200Response:
        """Sign an EVM transaction on behalf of an end user using a delegation.

        Args:
            user_id: The unique identifier of the end user.
            address: The 0x-prefixed address of the EVM account.
            transaction: The RLP-encoded unsigned transaction.

        Returns:
            SignEvmTransactionWithEndUserAccount200Response: The signed transaction result.

        """
        track_action(action="end_user_sign_evm_transaction")

        return await self.api_clients.embedded_wallets.sign_evm_transaction_with_end_user_account(
            user_id=user_id,
            sign_evm_transaction_with_end_user_account_request=SignEvmTransactionWithEndUserAccountRequest(
                address=address,
                transaction=transaction,
            ),
        )

    async def sign_evm_message(
        self,
        user_id: str,
        address: str,
        message: str,
    ) -> SignEvmMessageWithEndUserAccount200Response:
        """Sign an EVM message (EIP-191) on behalf of an end user using a delegation.

        Args:
            user_id: The unique identifier of the end user.
            address: The 0x-prefixed address of the EVM account.
            message: The message to sign.

        Returns:
            SignEvmMessageWithEndUserAccount200Response: The signature result.

        """
        track_action(action="end_user_sign_evm_message")

        return await self.api_clients.embedded_wallets.sign_evm_message_with_end_user_account(
            user_id=user_id,
            sign_evm_message_with_end_user_account_request=SignEvmMessageWithEndUserAccountRequest(
                address=address,
                message=message,
            ),
        )

    async def sign_evm_typed_data(
        self,
        user_id: str,
        address: str,
        typed_data: object,
    ) -> SignEvmTypedDataWithEndUserAccount200Response:
        """Sign EVM EIP-712 typed data on behalf of an end user using a delegation.

        Args:
            user_id: The unique identifier of the end user.
            address: The 0x-prefixed address of the EVM account.
            typed_data: The EIP-712 typed data object.

        Returns:
            SignEvmTypedDataWithEndUserAccount200Response: The signature result.

        """
        track_action(action="end_user_sign_evm_typed_data")

        return await self.api_clients.embedded_wallets.sign_evm_typed_data_with_end_user_account(
            user_id=user_id,
            sign_evm_typed_data_with_end_user_account_request=SignEvmTypedDataWithEndUserAccountRequest(
                address=address,
                typed_data=typed_data,
            ),
        )

    # ─── Delegated EVM Send Methods ───

    async def send_evm_transaction(
        self,
        user_id: str,
        address: str,
        transaction: str,
        network: str,
    ) -> SendEvmTransactionWithEndUserAccount200Response:
        """Send an EVM transaction on behalf of an end user using a delegation.

        Args:
            user_id: The unique identifier of the end user.
            address: The 0x-prefixed address of the EVM account.
            transaction: The RLP-encoded unsigned transaction.
            network: The EVM network to send the transaction on.

        Returns:
            SendEvmTransactionWithEndUserAccount200Response: The transaction result.

        """
        track_action(action="end_user_send_evm_transaction")

        return await self.api_clients.embedded_wallets.send_evm_transaction_with_end_user_account(
            user_id=user_id,
            send_evm_transaction_with_end_user_account_request=SendEvmTransactionWithEndUserAccountRequest(
                address=address,
                transaction=transaction,
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

        Args:
            user_id: The unique identifier of the end user.
            address: The 0x-prefixed address of the EVM account to send from.
            to: The 0x-prefixed address of the recipient.
            amount: The amount to send as a decimal string (e.g., "1.5").
            network: The EVM network to send the asset on.
            asset: The asset to send. Defaults to "usdc".
            use_cdp_paymaster: Whether to use CDP Paymaster for gas sponsorship.
            paymaster_url: Optional custom Paymaster URL.

        Returns:
            SendEvmAssetWithEndUserAccount200Response: The transaction result.

        """
        track_action(action="end_user_send_evm_asset")

        return await self.api_clients.embedded_wallets.send_evm_asset_with_end_user_account(
            user_id=user_id,
            address=address,
            asset=asset,
            send_evm_asset_with_end_user_account_request=SendEvmAssetWithEndUserAccountRequest(
                to=to,
                amount=amount,
                network=network,
                use_cdp_paymaster=use_cdp_paymaster,
                paymaster_url=paymaster_url,
            ),
        )

    async def send_user_operation(
        self,
        user_id: str,
        address: str,
        network: str,
        calls: list,
        use_cdp_paymaster: bool | None = None,
        paymaster_url: str | None = None,
        data_suffix: str | None = None,
    ) -> EvmUserOperation:
        """Send a user operation on behalf of an end user using a delegation.

        Args:
            user_id: The unique identifier of the end user.
            address: The address of the EVM Smart Account.
            network: The EVM network.
            calls: The list of calls to execute.
            use_cdp_paymaster: Whether to use CDP Paymaster for gas sponsorship.
            paymaster_url: Optional custom Paymaster URL.
            data_suffix: Optional data suffix for the user operation.

        Returns:
            EvmUserOperation: The user operation result.

        """
        track_action(action="end_user_send_user_operation")

        return await self.api_clients.embedded_wallets.send_user_operation_with_end_user_account(
            user_id=user_id,
            address=address,
            send_user_operation_with_end_user_account_request=SendUserOperationWithEndUserAccountRequest(
                network=network,
                calls=calls,
                use_cdp_paymaster=use_cdp_paymaster,
                paymaster_url=paymaster_url,
                data_suffix=data_suffix,
            ),
        )

    async def create_evm_eip7702_delegation(
        self,
        user_id: str,
        address: str,
        network: str,
        enable_spend_permissions: bool | None = None,
    ) -> CreateEvmEip7702DelegationWithEndUserAccount201Response:
        """Create an EVM EIP-7702 delegation on behalf of an end user.

        Args:
            user_id: The unique identifier of the end user.
            address: The 0x-prefixed address of the EVM EOA account.
            network: The EVM network.
            enable_spend_permissions: If true, enables spend permissions for the delegated account.

        Returns:
            CreateEvmEip7702DelegationWithEndUserAccount201Response: The delegation result.

        """
        track_action(action="end_user_create_evm_eip7702_delegation")

        return await self.api_clients.embedded_wallets.create_evm_eip7702_delegation_with_end_user_account(
            user_id=user_id,
            create_evm_eip7702_delegation_with_end_user_account_request=CreateEvmEip7702DelegationWithEndUserAccountRequest(
                address=address,
                network=network,
                enable_spend_permissions=enable_spend_permissions,
            ),
        )

    # ─── Delegated Solana Sign Methods ───

    async def sign_solana_message(
        self,
        user_id: str,
        address: str,
        message: str,
    ) -> SignSolanaMessageWithEndUserAccount200Response:
        """Sign a Solana message on behalf of an end user using a delegation.

        Args:
            user_id: The unique identifier of the end user.
            address: The base58 encoded address of the Solana account.
            message: The base64 encoded message to sign.

        Returns:
            SignSolanaMessageWithEndUserAccount200Response: The signature result.

        """
        track_action(action="end_user_sign_solana_message")

        return await self.api_clients.embedded_wallets.sign_solana_message_with_end_user_account(
            user_id=user_id,
            sign_solana_message_with_end_user_account_request=SignSolanaMessageWithEndUserAccountRequest(
                address=address,
                message=message,
            ),
        )

    async def sign_solana_transaction(
        self,
        user_id: str,
        address: str,
        transaction: str,
    ) -> SignSolanaTransactionWithEndUserAccount200Response:
        """Sign a Solana transaction on behalf of an end user using a delegation.

        Args:
            user_id: The unique identifier of the end user.
            address: The base58 encoded address of the Solana account.
            transaction: The base64 encoded transaction to sign.

        Returns:
            SignSolanaTransactionWithEndUserAccount200Response: The signed transaction result.

        """
        track_action(action="end_user_sign_solana_transaction")

        return await self.api_clients.embedded_wallets.sign_solana_transaction_with_end_user_account(
            user_id=user_id,
            sign_solana_transaction_with_end_user_account_request=SignSolanaTransactionWithEndUserAccountRequest(
                address=address,
                transaction=transaction,
            ),
        )

    # ─── Delegated Solana Send Methods ───

    async def send_solana_transaction(
        self,
        user_id: str,
        address: str,
        transaction: str,
        network: str,
    ) -> SendSolanaTransactionWithEndUserAccount200Response:
        """Send a Solana transaction on behalf of an end user using a delegation.

        Args:
            user_id: The unique identifier of the end user.
            address: The base58 encoded address of the Solana account.
            transaction: The base64 encoded transaction.
            network: The Solana network.

        Returns:
            SendSolanaTransactionWithEndUserAccount200Response: The transaction result.

        """
        track_action(action="end_user_send_solana_transaction")

        return await self.api_clients.embedded_wallets.send_solana_transaction_with_end_user_account(
            user_id=user_id,
            send_solana_transaction_with_end_user_account_request=SendSolanaTransactionWithEndUserAccountRequest(
                address=address,
                transaction=transaction,
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
        create_recipient_ata: bool | None = None,
    ) -> SendSolanaTransactionWithEndUserAccount200Response:
        """Send a Solana asset (e.g. USDC) on behalf of an end user using a delegation.

        Args:
            user_id: The unique identifier of the end user.
            address: The base58 encoded address of the Solana account to send from.
            to: The base58 encoded address of the recipient.
            amount: The amount to send as a decimal string (e.g., "1.5").
            network: The Solana network.
            asset: The asset to send. Defaults to "usdc".
            create_recipient_ata: Whether to create the recipient's Associated Token Account.

        Returns:
            SendSolanaTransactionWithEndUserAccount200Response: The transaction result.

        """
        track_action(action="end_user_send_solana_asset")

        return await self.api_clients.embedded_wallets.send_solana_asset_with_end_user_account(
            user_id=user_id,
            address=address,
            asset=asset,
            send_solana_asset_with_end_user_account_request=SendSolanaAssetWithEndUserAccountRequest(
                to=to,
                amount=amount,
                network=network,
                create_recipient_ata=create_recipient_ata,
            ),
        )
