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
from cdp.end_user_account import EndUserAccount, SendEvmAssetResult
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
from cdp.openapi_client.models.create_evm_eip7702_delegation_with_end_user_account_request import (
    CreateEvmEip7702DelegationWithEndUserAccountRequest,
)
from cdp.openapi_client.models.eip712_message import EIP712Message
from cdp.openapi_client.models.evm_call import EvmCall
from cdp.openapi_client.models.evm_eip7702_delegation_network import EvmEip7702DelegationNetwork
from cdp.openapi_client.models.evm_user_operation import EvmUserOperation
from cdp.openapi_client.models.evm_user_operation_network import EvmUserOperationNetwork
from cdp.openapi_client.models.import_end_user_request import ImportEndUserRequest
from cdp.openapi_client.models.revoke_delegation_for_end_user_request import (
    RevokeDelegationForEndUserRequest,
)
from cdp.openapi_client.models.send_evm_asset_with_end_user_account_request import (
    SendEvmAssetWithEndUserAccountRequest,
)
from cdp.openapi_client.models.send_evm_transaction_with_end_user_account_request import (
    SendEvmTransactionWithEndUserAccountRequest,
)
from cdp.openapi_client.models.send_solana_asset_with_end_user_account_request import (
    SendSolanaAssetWithEndUserAccountRequest,
)
from cdp.openapi_client.models.send_solana_transaction_with_end_user_account_request import (
    SendSolanaTransactionWithEndUserAccountRequest,
)
from cdp.openapi_client.models.send_user_operation_with_end_user_account_request import (
    SendUserOperationWithEndUserAccountRequest,
)
from cdp.openapi_client.models.sign_evm_hash_with_end_user_account_request import (
    SignEvmHashWithEndUserAccountRequest,
)
from cdp.openapi_client.models.sign_evm_message_with_end_user_account_request import (
    SignEvmMessageWithEndUserAccountRequest,
)
from cdp.openapi_client.models.sign_evm_transaction_with_end_user_account_request import (
    SignEvmTransactionWithEndUserAccountRequest,
)
from cdp.openapi_client.models.sign_evm_typed_data_with_end_user_account_request import (
    SignEvmTypedDataWithEndUserAccountRequest,
)
from cdp.openapi_client.models.sign_solana_hash_with_end_user_account_request import (
    SignSolanaHashWithEndUserAccountRequest,
)
from cdp.openapi_client.models.sign_solana_message_with_end_user_account_request import (
    SignSolanaMessageWithEndUserAccountRequest,
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

    def __init__(self, api_clients: ApiClients, project_id: str | None = None):
        self.api_clients = api_clients
        self._project_id = project_id

    def _require_project_id(self) -> str:
        """Return the project ID or raise an error if it is not set.

        Returns:
            str: The project ID.

        Raises:
            UserInputValidationError: If the project ID is not configured.

        """
        if not self._project_id:
            raise UserInputValidationError(
                "project_id is required for delegation operations. "
                "Set it via the CDP_PROJECT_ID environment variable or pass it as "
                "project_id to CdpClient."
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

        return EndUserAccount(end_user, self.api_clients, project_id=self._project_id)

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
            EndUserAccount(end_user, self.api_clients, project_id=self._project_id)
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

        return EndUserAccount(end_user, self.api_clients, project_id=self._project_id)

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

    # -------------------------------------------------------------------------
    # Delegation operations
    # -------------------------------------------------------------------------

    async def revoke_delegation_for_end_user(
        self,
        user_id: str,
        wallet_secret_id: str | None = None,
    ) -> None:
        """Revoke all active delegations for an end user.

        This operation can be performed by the end user themselves or by a developer
        using their API key.

        Args:
            user_id: The unique identifier of the end user.
            wallet_secret_id: The ID of the Temporary Wallet Secret used to sign the
                X-Wallet-Auth header. Required when not using delegated signing.

        """
        track_action(action="revoke_delegation_for_end_user")

        project_id = self._require_project_id()

        await self.api_clients.embedded_wallets.revoke_delegation_for_end_user(
            project_id=project_id,
            user_id=user_id,
            revoke_delegation_for_end_user_request=RevokeDelegationForEndUserRequest(
                wallet_secret_id=wallet_secret_id,
            ),
        )

    async def create_evm_eip7702_delegation(
        self,
        user_id: str,
        address: str,
        network: EvmEip7702DelegationNetwork,
        enable_spend_permissions: bool = False,
        wallet_secret_id: str | None = None,
    ) -> str:
        """Create an EIP-7702 delegation for an end user's EVM EOA account.

        Upgrades an EVM EOA with smart account capabilities, enabling batched
        transactions and gas sponsorship via paymaster.

        Args:
            user_id: The unique identifier of the end user.
            address: The 0x-prefixed address of the EVM account to delegate.
            network: The network on which to create the delegation.
            enable_spend_permissions: Whether to configure spend permissions. Defaults to False.
            wallet_secret_id: The ID of the Temporary Wallet Secret. Required when not
                using delegated signing.

        Returns:
            str: The delegation operation ID. Use this to poll the operation status.

        """
        track_action(action="create_evm_eip7702_delegation")

        project_id = self._require_project_id()

        result = await self.api_clients.embedded_wallets.create_evm_eip7702_delegation_with_end_user_account(
            project_id=project_id,
            user_id=user_id,
            create_evm_eip7702_delegation_with_end_user_account_request=CreateEvmEip7702DelegationWithEndUserAccountRequest(
                address=address,
                network=network,
                enable_spend_permissions=enable_spend_permissions,
                wallet_secret_id=wallet_secret_id,
            ),
        )

        return result.delegation_operation_id

    async def sign_evm_hash(
        self,
        user_id: str,
        address: str,
        hash: str,
        wallet_secret_id: str | None = None,
    ) -> str:
        """Sign an arbitrary 32-byte hash with an end user's EVM account.

        Args:
            user_id: The unique identifier of the end user.
            address: The 0x-prefixed address of the EVM account.
            hash: The arbitrary 32-byte hash to sign.
            wallet_secret_id: The ID of the Temporary Wallet Secret. Required when not
                using delegated signing.

        Returns:
            str: The signature as a 0x-prefixed hex string.

        """
        track_action(action="sign_evm_hash")

        project_id = self._require_project_id()

        result = await self.api_clients.embedded_wallets.sign_evm_hash_with_end_user_account(
            project_id=project_id,
            user_id=user_id,
            sign_evm_hash_with_end_user_account_request=SignEvmHashWithEndUserAccountRequest(
                hash=hash,
                address=address,
                wallet_secret_id=wallet_secret_id,
            ),
        )

        return result.signature

    async def sign_evm_message(
        self,
        user_id: str,
        address: str,
        message: str,
        wallet_secret_id: str | None = None,
    ) -> str:
        """Sign a message with an end user's EVM account (EIP-191).

        Args:
            user_id: The unique identifier of the end user.
            address: The 0x-prefixed address of the EVM account.
            message: The message to sign.
            wallet_secret_id: The ID of the Temporary Wallet Secret. Required when not
                using delegated signing.

        Returns:
            str: The signature as a 0x-prefixed hex string.

        """
        track_action(action="sign_evm_message")

        project_id = self._require_project_id()

        result = await self.api_clients.embedded_wallets.sign_evm_message_with_end_user_account(
            project_id=project_id,
            user_id=user_id,
            sign_evm_message_with_end_user_account_request=SignEvmMessageWithEndUserAccountRequest(
                address=address,
                message=message,
                wallet_secret_id=wallet_secret_id,
            ),
        )

        return result.signature

    async def sign_evm_transaction(
        self,
        user_id: str,
        address: str,
        transaction: str,
        wallet_secret_id: str | None = None,
    ) -> str:
        """Sign an RLP-encoded EVM transaction with an end user's EVM account.

        Args:
            user_id: The unique identifier of the end user.
            address: The 0x-prefixed address of the EVM account.
            transaction: The RLP-encoded transaction to sign, as a 0x-prefixed hex string.
            wallet_secret_id: The ID of the Temporary Wallet Secret. Required when not
                using delegated signing.

        Returns:
            str: The RLP-encoded signed transaction as a 0x-prefixed hex string.

        """
        track_action(action="sign_evm_transaction")

        project_id = self._require_project_id()

        result = await self.api_clients.embedded_wallets.sign_evm_transaction_with_end_user_account(
            project_id=project_id,
            user_id=user_id,
            sign_evm_transaction_with_end_user_account_request=SignEvmTransactionWithEndUserAccountRequest(
                address=address,
                transaction=transaction,
                wallet_secret_id=wallet_secret_id,
            ),
        )

        return result.signed_transaction

    async def sign_evm_typed_data(
        self,
        user_id: str,
        address: str,
        typed_data: EIP712Message,
        wallet_secret_id: str | None = None,
    ) -> str:
        """Sign EIP-712 typed data with an end user's EVM account.

        Args:
            user_id: The unique identifier of the end user.
            address: The 0x-prefixed address of the EVM account.
            typed_data: The EIP-712 typed data to sign.
            wallet_secret_id: The ID of the Temporary Wallet Secret. Required when not
                using delegated signing.

        Returns:
            str: The signature as a 0x-prefixed hex string.

        """
        track_action(action="sign_evm_typed_data")

        project_id = self._require_project_id()

        result = await self.api_clients.embedded_wallets.sign_evm_typed_data_with_end_user_account(
            project_id=project_id,
            user_id=user_id,
            sign_evm_typed_data_with_end_user_account_request=SignEvmTypedDataWithEndUserAccountRequest(
                address=address,
                typed_data=typed_data,
                wallet_secret_id=wallet_secret_id,
            ),
        )

        return result.signature

    async def send_evm_transaction(
        self,
        user_id: str,
        address: str,
        network: str,
        transaction: str,
        wallet_secret_id: str | None = None,
    ) -> str:
        """Sign and send an RLP-encoded EVM transaction for an end user.

        Args:
            user_id: The unique identifier of the end user.
            address: The 0x-prefixed address of the EVM account.
            network: The network to send the transaction to (e.g. "base", "base-sepolia").
            transaction: The RLP-encoded transaction to sign and send, as a 0x-prefixed hex string.
            wallet_secret_id: The ID of the Temporary Wallet Secret. Required when not
                using delegated signing.

        Returns:
            str: The transaction hash as a 0x-prefixed hex string.

        """
        track_action(action="send_evm_transaction")

        project_id = self._require_project_id()

        result = await self.api_clients.embedded_wallets.send_evm_transaction_with_end_user_account(
            project_id=project_id,
            user_id=user_id,
            send_evm_transaction_with_end_user_account_request=SendEvmTransactionWithEndUserAccountRequest(
                address=address,
                network=network,
                transaction=transaction,
                wallet_secret_id=wallet_secret_id,
            ),
        )

        return result.transaction_hash

    async def send_evm_asset(
        self,
        user_id: str,
        address: str,
        network: str,
        to: str,
        amount: str,
        use_cdp_paymaster: bool | None = None,
        paymaster_url: str | None = None,
        wallet_secret_id: str | None = None,
    ) -> SendEvmAssetResult:
        """Send USDC from an end user's EVM account (EOA or Smart Account).

        Automatically handles contract resolution, decimal conversion, gas estimation,
        and transaction encoding.

        Args:
            user_id: The unique identifier of the end user.
            address: The 0x-prefixed address of the EVM account (EOA or Smart Account).
            network: The EVM network to send USDC on (e.g. "base", "base-sepolia").
            to: The 0x-prefixed address of the recipient.
            amount: The amount of USDC to send as a decimal string (e.g. "1.5" or "25.50").
            use_cdp_paymaster: Whether to use CDP Paymaster to sponsor gas fees. Only
                applicable for EVM Smart Accounts. Cannot be used together with paymaster_url.
            paymaster_url: Custom Paymaster URL for gas sponsorship. Only applicable for
                EVM Smart Accounts. Cannot be used together with use_cdp_paymaster.
            wallet_secret_id: The ID of the Temporary Wallet Secret. Required when not
                using delegated signing.

        Returns:
            SendEvmAssetResult: Contains transaction_hash (for EOA) or user_op_hash (for Smart Accounts).

        """
        track_action(action="send_evm_asset")

        project_id = self._require_project_id()

        result = await self.api_clients.embedded_wallets.send_evm_asset_with_end_user_account(
            project_id=project_id,
            user_id=user_id,
            address=address,
            asset="usdc",
            send_evm_asset_with_end_user_account_request=SendEvmAssetWithEndUserAccountRequest(
                to=to,
                amount=amount,
                network=network,
                use_cdp_paymaster=use_cdp_paymaster,
                paymaster_url=paymaster_url,
                wallet_secret_id=wallet_secret_id,
            ),
        )

        return SendEvmAssetResult(
            transaction_hash=result.transaction_hash,
            user_op_hash=result.user_op_hash,
        )

    async def send_user_operation(
        self,
        user_id: str,
        address: str,
        network: EvmUserOperationNetwork,
        calls: list[EvmCall],
        use_cdp_paymaster: bool,
        paymaster_url: str | None = None,
        data_suffix: str | None = None,
        wallet_secret_id: str | None = None,
    ) -> EvmUserOperation:
        """Prepare, sign, and send a user operation for an end user's EVM Smart Account.

        Args:
            user_id: The unique identifier of the end user.
            address: The address of the EVM Smart Account to execute the user operation from.
            network: The network on which to send the user operation.
            calls: The list of calls to make from the Smart Account.
            use_cdp_paymaster: Whether to use the CDP Paymaster for gas sponsorship.
            paymaster_url: Custom Paymaster URL. Cannot be used together with use_cdp_paymaster.
            data_suffix: The EIP-8021 data suffix (hex-encoded) for transaction attribution.
            wallet_secret_id: The ID of the Temporary Wallet Secret. Required when not
                using delegated signing.

        Returns:
            EvmUserOperation: The submitted user operation.

        """
        track_action(action="send_user_operation")

        project_id = self._require_project_id()

        return await self.api_clients.embedded_wallets.send_user_operation_with_end_user_account(
            project_id=project_id,
            user_id=user_id,
            address=address,
            send_user_operation_with_end_user_account_request=SendUserOperationWithEndUserAccountRequest(
                network=network,
                calls=calls,
                use_cdp_paymaster=use_cdp_paymaster,
                paymaster_url=paymaster_url,
                data_suffix=data_suffix,
                wallet_secret_id=wallet_secret_id,
            ),
        )

    async def sign_solana_hash(
        self,
        user_id: str,
        address: str,
        hash: str,
        wallet_secret_id: str | None = None,
    ) -> str:
        """Sign an arbitrary 32-byte hash with an end user's Solana account.

        Args:
            user_id: The unique identifier of the end user.
            address: The base58-encoded address of the Solana account.
            hash: The arbitrary 32-byte hash to sign, as a base58-encoded string.
            wallet_secret_id: The ID of the Temporary Wallet Secret. Required when not
                using delegated signing.

        Returns:
            str: The signature as a base58-encoded string.

        """
        track_action(action="sign_solana_hash")

        project_id = self._require_project_id()

        result = await self.api_clients.embedded_wallets.sign_solana_hash_with_end_user_account(
            project_id=project_id,
            user_id=user_id,
            sign_solana_hash_with_end_user_account_request=SignSolanaHashWithEndUserAccountRequest(
                hash=hash,
                address=address,
                wallet_secret_id=wallet_secret_id,
            ),
        )

        return result.signature

    async def sign_solana_message(
        self,
        user_id: str,
        address: str,
        message: str,
        wallet_secret_id: str | None = None,
    ) -> str:
        """Sign a message with an end user's Solana account.

        Args:
            user_id: The unique identifier of the end user.
            address: The base58-encoded address of the Solana account.
            message: The base64-encoded message to sign.
            wallet_secret_id: The ID of the Temporary Wallet Secret. Required when not
                using delegated signing.

        Returns:
            str: The signature as a base58-encoded string.

        """
        track_action(action="sign_solana_message")

        project_id = self._require_project_id()

        result = await self.api_clients.embedded_wallets.sign_solana_message_with_end_user_account(
            project_id=project_id,
            user_id=user_id,
            sign_solana_message_with_end_user_account_request=SignSolanaMessageWithEndUserAccountRequest(
                address=address,
                message=message,
                wallet_secret_id=wallet_secret_id,
            ),
        )

        return result.signature

    async def sign_solana_transaction(
        self,
        user_id: str,
        address: str,
        transaction: str,
        wallet_secret_id: str | None = None,
    ) -> str:
        """Sign a Solana transaction with an end user's Solana account.

        Args:
            user_id: The unique identifier of the end user.
            address: The base58-encoded address of the Solana account.
            transaction: The base64-encoded transaction to sign.
            wallet_secret_id: The ID of the Temporary Wallet Secret. Required when not
                using delegated signing.

        Returns:
            str: The base64-encoded signed transaction.

        """
        track_action(action="sign_solana_transaction")

        project_id = self._require_project_id()

        result = await self.api_clients.embedded_wallets.sign_solana_transaction_with_end_user_account(
            project_id=project_id,
            user_id=user_id,
            sign_solana_transaction_with_end_user_account_request=SignSolanaTransactionWithEndUserAccountRequest(
                address=address,
                transaction=transaction,
                wallet_secret_id=wallet_secret_id,
            ),
        )

        return result.signed_transaction

    async def send_solana_transaction(
        self,
        user_id: str,
        address: str,
        network: str,
        transaction: str,
        use_cdp_sponsor: bool | None = None,
        wallet_secret_id: str | None = None,
    ) -> str:
        """Sign and send a Solana transaction for an end user.

        Args:
            user_id: The unique identifier of the end user.
            address: The base58-encoded address of the Solana account.
            network: The Solana network to send the transaction to (e.g. "solana", "solana-devnet").
            transaction: The base64-encoded transaction to sign and send.
            use_cdp_sponsor: Whether CDP sponsors the transaction fees on behalf of the end user.
            wallet_secret_id: The ID of the Temporary Wallet Secret. Required when not
                using delegated signing.

        Returns:
            str: The base58-encoded transaction signature.

        """
        track_action(action="send_solana_transaction")

        project_id = self._require_project_id()

        result = await self.api_clients.embedded_wallets.send_solana_transaction_with_end_user_account(
            project_id=project_id,
            user_id=user_id,
            send_solana_transaction_with_end_user_account_request=SendSolanaTransactionWithEndUserAccountRequest(
                address=address,
                network=network,
                transaction=transaction,
                use_cdp_sponsor=use_cdp_sponsor,
                wallet_secret_id=wallet_secret_id,
            ),
        )

        return result.transaction_signature

    async def send_solana_asset(
        self,
        user_id: str,
        address: str,
        network: str,
        to: str,
        amount: str,
        create_recipient_ata: bool | None = None,
        use_cdp_sponsor: bool | None = None,
        wallet_secret_id: str | None = None,
    ) -> str:
        """Send USDC from an end user's Solana account.

        Automatically handles mint resolution, ATA creation, decimal conversion,
        and transaction encoding.

        Args:
            user_id: The unique identifier of the end user.
            address: The base58-encoded address of the Solana account.
            network: The Solana network to send USDC on (e.g. "solana", "solana-devnet").
            to: The base58-encoded address of the recipient.
            amount: The amount of USDC to send as a decimal string (e.g. "1.5" or "25.50").
            create_recipient_ata: Whether to automatically create an Associated Token Account
                for the recipient if it doesn't exist. When true, the sender pays the rent.
            use_cdp_sponsor: Whether CDP sponsors the transaction fees on behalf of the end user.
            wallet_secret_id: The ID of the Temporary Wallet Secret. Required when not
                using delegated signing.

        Returns:
            str: The base58-encoded transaction signature.

        """
        track_action(action="send_solana_asset")

        project_id = self._require_project_id()

        result = await self.api_clients.embedded_wallets.send_solana_asset_with_end_user_account(
            project_id=project_id,
            user_id=user_id,
            address=address,
            asset="usdc",
            send_solana_asset_with_end_user_account_request=SendSolanaAssetWithEndUserAccountRequest(
                to=to,
                amount=amount,
                network=network,
                create_recipient_ata=create_recipient_ata,
                use_cdp_sponsor=use_cdp_sponsor,
                wallet_secret_id=wallet_secret_id,
            ),
        )

        return result.transaction_signature
