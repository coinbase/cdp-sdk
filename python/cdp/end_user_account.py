from datetime import datetime

from pydantic import BaseModel, ConfigDict

from cdp.analytics import track_action
from cdp.api_clients import ApiClients
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
from cdp.openapi_client.models.create_evm_eip7702_delegation201_response import (
    CreateEvmEip7702Delegation201Response,
)
from cdp.openapi_client.models.create_evm_eip7702_delegation_with_end_user_account_request import (
    CreateEvmEip7702DelegationWithEndUserAccountRequest,
)
from cdp.openapi_client.models.end_user import EndUser as EndUserModel
from cdp.openapi_client.models.end_user_evm_account import EndUserEvmAccount
from cdp.openapi_client.models.end_user_evm_smart_account import EndUserEvmSmartAccount
from cdp.openapi_client.models.end_user_solana_account import EndUserSolanaAccount
from cdp.openapi_client.models.evm_user_operation import EvmUserOperation
from cdp.openapi_client.models.mfa_methods import MFAMethods
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


class EndUserAccount(BaseModel):
    """A class representing an end user with action methods.

    This wraps the OpenAPI EndUser model and adds convenience methods for
    managing accounts and performing delegated signing/sending operations
    directly on the object.

    Delegated sign/send operations require the end user to have created a
    delegation allowing the developer to sign on their behalf.
    """

    model_config = ConfigDict(arbitrary_types_allowed=True)

    def __init__(
        self,
        end_user_model: EndUserModel,
        api_clients: ApiClients,
        project_id: str | None = None,
    ) -> None:
        """Initialize the EndUserAccount class.

        Args:
            end_user_model (EndUserModel): The end user model from the API.
            api_clients (ApiClients): The API clients.
            project_id (str | None): Optional CDP project ID for delegated operations.

        """
        super().__init__()

        self.__user_id = end_user_model.user_id
        self.__authentication_methods = end_user_model.authentication_methods
        self.__mfa_methods = end_user_model.mfa_methods
        self.__evm_accounts = end_user_model.evm_accounts
        self.__evm_account_objects = end_user_model.evm_account_objects
        self.__evm_smart_accounts = end_user_model.evm_smart_accounts
        self.__evm_smart_account_objects = end_user_model.evm_smart_account_objects
        self.__solana_accounts = end_user_model.solana_accounts
        self.__solana_account_objects = end_user_model.solana_account_objects
        self.__created_at = end_user_model.created_at
        self.__api_clients = api_clients
        self.__project_id = project_id

    def _require_project_id(self) -> str:
        """Return the configured project ID or raise if not set."""
        if not self.__project_id:
            raise ValueError(
                "Project ID not configured. Delegated end-user operations require a project ID. "
                "Set the CDP_PROJECT_ID environment variable, or pass project_id to CdpClient."
            )
        return self.__project_id

    def __str__(self) -> str:
        """Get the string representation of the end user account.

        Returns:
            str: The string representation of the end user account.

        """
        return f"EndUserAccount(user_id={self.__user_id})"

    def __repr__(self) -> str:
        """Get the repr representation of the end user account.

        Returns:
            str: The repr representation of the end user account.

        """
        return f"EndUserAccount(user_id={self.__user_id})"

    @property
    def user_id(self) -> str:
        """Get the user ID of the end user.

        Returns:
            str: The user ID.

        """
        return self.__user_id

    @property
    def authentication_methods(self) -> list[AuthenticationMethod]:
        """Get the authentication methods of the end user.

        Returns:
            list[AuthenticationMethod]: The list of authentication methods.

        """
        return self.__authentication_methods

    @property
    def mfa_methods(self) -> MFAMethods | None:
        """Get the MFA methods of the end user.

        Returns:
            MFAMethods | None: The MFA methods, if any.

        """
        return self.__mfa_methods

    @property
    def evm_accounts(self) -> list[str]:
        """Get the EVM account addresses of the end user.

        **DEPRECATED**: Use `evm_account_objects` instead for richer account information.

        Returns:
            list[str]: The list of EVM account addresses.

        """
        return self.__evm_accounts

    @property
    def evm_account_objects(self) -> list[EndUserEvmAccount]:
        """Get the EVM accounts of the end user.

        Returns:
            list[EndUserEvmAccount]: The list of EVM accounts.

        """
        return self.__evm_account_objects

    @property
    def evm_smart_accounts(self) -> list[str]:
        """Get the EVM smart account addresses of the end user.

        **DEPRECATED**: Use `evm_smart_account_objects` instead for richer account information.

        Returns:
            list[str]: The list of EVM smart account addresses.

        """
        return self.__evm_smart_accounts

    @property
    def evm_smart_account_objects(self) -> list[EndUserEvmSmartAccount]:
        """Get the EVM smart accounts of the end user.

        Returns:
            list[EndUserEvmSmartAccount]: The list of EVM smart accounts.

        """
        return self.__evm_smart_account_objects

    @property
    def solana_accounts(self) -> list[str]:
        """Get the Solana account addresses of the end user.

        **DEPRECATED**: Use `solana_account_objects` instead for richer account information.

        Returns:
            list[str]: The list of Solana account addresses.

        """
        return self.__solana_accounts

    @property
    def solana_account_objects(self) -> list[EndUserSolanaAccount]:
        """Get the Solana accounts of the end user.

        Returns:
            list[EndUserSolanaAccount]: The list of Solana accounts.

        """
        return self.__solana_account_objects

    @property
    def created_at(self) -> datetime:
        """Get the creation timestamp of the end user.

        Returns:
            datetime: The creation timestamp.

        """
        return self.__created_at

    # ==================== Account Management ====================

    async def add_evm_account(self) -> AddEndUserEvmAccount201Response:
        """Add an EVM EOA (Externally Owned Account) to this end user.

        End users can have up to 10 EVM accounts.

        Returns:
            AddEndUserEvmAccount201Response: The result containing the newly created EVM EOA account.

        """
        track_action(action="end_user_add_evm_account")

        return await self.__api_clients.end_user.add_end_user_evm_account(
            user_id=self.__user_id,
            body={},
        )

    async def add_evm_smart_account(
        self, enable_spend_permissions: bool
    ) -> AddEndUserEvmSmartAccount201Response:
        """Add an EVM smart account to this end user.

        This also creates a new EVM EOA account to serve as the owner of the smart account.

        Args:
            enable_spend_permissions: If true, enables spend permissions for the EVM smart account.

        Returns:
            AddEndUserEvmSmartAccount201Response: The result containing the newly created EVM smart account.

        """
        track_action(action="end_user_add_evm_smart_account")

        return await self.__api_clients.end_user.add_end_user_evm_smart_account(
            user_id=self.__user_id,
            add_end_user_evm_smart_account_request=AddEndUserEvmSmartAccountRequest(
                enable_spend_permissions=enable_spend_permissions,
            ),
        )

    async def add_solana_account(self) -> AddEndUserSolanaAccount201Response:
        """Add a Solana account to this end user.

        End users can have up to 10 Solana accounts.

        Returns:
            AddEndUserSolanaAccount201Response: The result containing the newly created Solana account.

        """
        track_action(action="end_user_add_solana_account")

        return await self.__api_clients.end_user.add_end_user_solana_account(
            user_id=self.__user_id,
            body={},
        )

    # ==================== Delegated EVM Sign Operations ====================

    async def sign_evm_hash(
        self,
        hash: str,
        address: str | None = None,
    ) -> SignEvmHash200Response:
        """Sign an EVM hash using a delegation.

        Requires the end user to have created a delegation.

        Args:
            hash: The 32-byte hash to sign (0x-prefixed hex).
            address: The EVM address to sign with. Defaults to the first EVM account.

        Returns:
            SignEvmHash200Response: The signature response.

        """
        track_action(action="end_user_sign_evm_hash")

        project_id = self._require_project_id()
        address = address or self.__evm_account_objects[0].address
        return await self.__api_clients.embedded_wallets_core.sign_evm_hash_with_end_user_account(
            project_id=project_id,
            user_id=self.__user_id,
            sign_evm_hash_with_end_user_account_request=SignEvmHashWithEndUserAccountRequest(
                hash=hash,
                address=address,
            ),
        )

    async def sign_evm_message(
        self,
        message: str,
        address: str | None = None,
    ) -> SignEvmMessage200Response:
        """Sign an EIP-191 message using a delegation.

        Requires the end user to have created a delegation.

        Args:
            message: The plaintext message to sign.
            address: The EVM address to sign with. Defaults to the first EVM account.

        Returns:
            SignEvmMessage200Response: The signature response.

        """
        track_action(action="end_user_sign_evm_message")

        project_id = self._require_project_id()
        address = address or self.__evm_account_objects[0].address
        return await self.__api_clients.embedded_wallets_core.sign_evm_message_with_end_user_account(
            project_id=project_id,
            user_id=self.__user_id,
            sign_evm_message_with_end_user_account_request=SignEvmMessageWithEndUserAccountRequest(
                message=message,
                address=address,
            ),
        )

    async def sign_evm_transaction(
        self,
        transaction: str,
        address: str | None = None,
    ) -> SignEvmTransaction200Response:
        """Sign an EVM transaction using a delegation.

        Requires the end user to have created a delegation.

        Args:
            transaction: The RLP-encoded unsigned EIP-1559 transaction (0x-prefixed hex).
            address: The EVM address to sign with. Defaults to the first EVM account.

        Returns:
            SignEvmTransaction200Response: The signed transaction response.

        """
        track_action(action="end_user_sign_evm_transaction")

        project_id = self._require_project_id()
        address = address or self.__evm_account_objects[0].address
        return await self.__api_clients.embedded_wallets_core.sign_evm_transaction_with_end_user_account(
            project_id=project_id,
            user_id=self.__user_id,
            sign_evm_transaction_with_end_user_account_request=SignEvmTransactionWithEndUserAccountRequest(
                transaction=transaction,
                address=address,
            ),
        )

    async def sign_evm_typed_data(
        self,
        typed_data: dict,
        address: str | None = None,
    ) -> SignEvmTypedData200Response:
        """Sign EIP-712 typed data using a delegation.

        Requires the end user to have created a delegation.

        Args:
            typed_data: The EIP-712 typed data structure.
            address: The EVM address to sign with. Defaults to the first EVM account.

        Returns:
            SignEvmTypedData200Response: The signature response.

        """
        track_action(action="end_user_sign_evm_typed_data")

        project_id = self._require_project_id()
        address = address or self.__evm_account_objects[0].address
        return await self.__api_clients.embedded_wallets_core.sign_evm_typed_data_with_end_user_account(
            project_id=project_id,
            user_id=self.__user_id,
            sign_evm_typed_data_with_end_user_account_request=SignEvmTypedDataWithEndUserAccountRequest(
                typed_data_hash=typed_data,
                address=address,
            ),
        )

    # ==================== Delegated EVM Send Operations ====================

    async def send_evm_transaction(
        self,
        transaction: str,
        network: str,
        address: str | None = None,
    ) -> SendEvmTransaction200Response:
        """Send an EVM transaction using a delegation.

        Signs and broadcasts the transaction. Requires the end user to have
        created a delegation.

        Args:
            transaction: The RLP-encoded unsigned EIP-1559 transaction (0x-prefixed hex).
            network: The target EVM network (e.g. "base-sepolia", "base").
            address: The EVM address to send from. Defaults to the first EVM account.

        Returns:
            SendEvmTransaction200Response: The transaction hash response.

        """
        track_action(action="end_user_send_evm_transaction")

        project_id = self._require_project_id()
        address = address or self.__evm_account_objects[0].address
        return await self.__api_clients.embedded_wallets_core.send_evm_transaction_with_end_user_account(
            project_id=project_id,
            user_id=self.__user_id,
            send_evm_transaction_with_end_user_account_request=SendEvmTransactionWithEndUserAccountRequest(
                transaction=transaction,
                address=address,
                network=network,
            ),
        )

    async def send_evm_asset(
        self,
        to: str,
        amount: str,
        network: str,
        address: str | None = None,
        asset: str = "usdc",
        use_cdp_paymaster: bool | None = None,
        paymaster_url: str | None = None,
    ) -> SendEvmAssetWithEndUserAccount200Response:
        """Send an EVM asset (e.g. USDC) using a delegation.

        Requires the end user to have created a delegation.

        Args:
            to: The recipient address.
            amount: The amount to send (e.g. "1000000" for 1 USDC).
            network: The target EVM network (e.g. "base-sepolia", "base").
            address: The EVM address to send from. Defaults to the first EVM account.
            asset: The asset to send. Defaults to "usdc".
            use_cdp_paymaster: Whether to use CDP paymaster for gas sponsorship.
            paymaster_url: Optional custom paymaster URL.

        Returns:
            SendEvmAssetWithEndUserAccount200Response: The transaction/user-op hash response.

        """
        track_action(action="end_user_send_evm_asset")

        project_id = self._require_project_id()
        address = address or self.__evm_account_objects[0].address
        request = SendEvmAssetWithEndUserAccountRequest(
            to=to,
            amount=amount,
            network=network,
        )
        if use_cdp_paymaster is not None:
            request.use_cdp_paymaster = use_cdp_paymaster
        if paymaster_url is not None:
            request.paymaster_url = paymaster_url

        return await self.__api_clients.embedded_wallets_core.send_evm_asset_with_end_user_account(
            project_id=project_id,
            user_id=self.__user_id,
            address=address,
            asset=asset,
            send_evm_asset_with_end_user_account_request=request,
        )

    async def send_user_operation(
        self,
        network: str,
        calls: list[dict],
        address: str | None = None,
        use_cdp_paymaster: bool = True,
        paymaster_url: str | None = None,
        data_suffix: str | None = None,
    ) -> EvmUserOperation:
        """Send a user operation for a Smart Account using a delegation.

        Requires the end user to have created a delegation.

        Args:
            network: The target EVM network (e.g. "base-sepolia", "base").
            calls: Array of call objects, each with "to", "value", and "data" keys.
            address: The smart account address. Defaults to the first EVM smart account.
            use_cdp_paymaster: Whether to use CDP paymaster. Defaults to True.
            paymaster_url: Optional custom paymaster URL.
            data_suffix: Optional hex data suffix appended to calldata.

        Returns:
            EvmUserOperation: The user operation result.

        """
        track_action(action="end_user_send_user_operation")

        project_id = self._require_project_id()
        address = address or self.__evm_smart_account_objects[0].address
        request = SendUserOperationWithEndUserAccountRequest(
            network=network,
            calls=calls,
            use_cdp_paymaster=use_cdp_paymaster,
        )
        if paymaster_url is not None:
            request.paymaster_url = paymaster_url
        if data_suffix is not None:
            request.data_suffix = data_suffix

        return await self.__api_clients.embedded_wallets_core.send_user_operation_with_end_user_account(
            project_id=project_id,
            user_id=self.__user_id,
            address=address,
            send_user_operation_with_end_user_account_request=request,
        )

    # ==================== Delegated Solana Sign Operations ====================

    async def sign_solana_hash(
        self,
        hash: str,
        address: str | None = None,
    ) -> SignSolanaHashWithEndUserAccount200Response:
        """Sign a Solana hash using a delegation.

        Requires the end user to have created a delegation.

        Args:
            hash: The base58-encoded 32-byte hash.
            address: The Solana address to sign with. Defaults to the first Solana account.

        Returns:
            SignSolanaHashWithEndUserAccount200Response: The signature response.

        """
        track_action(action="end_user_sign_solana_hash")

        project_id = self._require_project_id()
        address = address or self.__solana_account_objects[0].address
        return await self.__api_clients.embedded_wallets_core.sign_solana_hash_with_end_user_account(
            project_id=project_id,
            user_id=self.__user_id,
            sign_solana_hash_with_end_user_account_request=SignSolanaHashWithEndUserAccountRequest(
                hash=hash,
                address=address,
            ),
        )

    async def sign_solana_message(
        self,
        message: str,
        address: str | None = None,
    ) -> SignSolanaMessage200Response:
        """Sign a Solana message using a delegation.

        Requires the end user to have created a delegation.

        Args:
            message: The base64-encoded message to sign.
            address: The Solana address to sign with. Defaults to the first Solana account.

        Returns:
            SignSolanaMessage200Response: The signature response.

        """
        track_action(action="end_user_sign_solana_message")

        project_id = self._require_project_id()
        address = address or self.__solana_account_objects[0].address
        return await self.__api_clients.embedded_wallets_core.sign_solana_message_with_end_user_account(
            project_id=project_id,
            user_id=self.__user_id,
            sign_solana_message_with_end_user_account_request=SignSolanaMessageWithEndUserAccountRequest(
                message=message,
                address=address,
            ),
        )

    async def sign_solana_transaction(
        self,
        transaction: str,
        address: str | None = None,
    ) -> SignSolanaTransaction200Response:
        """Sign a Solana transaction using a delegation.

        Requires the end user to have created a delegation.

        Args:
            transaction: The base64-encoded unsigned Solana transaction.
            address: The Solana address to sign with. Defaults to the first Solana account.

        Returns:
            SignSolanaTransaction200Response: The signed transaction response.

        """
        track_action(action="end_user_sign_solana_transaction")

        project_id = self._require_project_id()
        address = address or self.__solana_account_objects[0].address
        return await self.__api_clients.embedded_wallets_core.sign_solana_transaction_with_end_user_account(
            project_id=project_id,
            user_id=self.__user_id,
            sign_solana_transaction_with_end_user_account_request=SignSolanaTransactionWithEndUserAccountRequest(
                transaction=transaction,
                address=address,
            ),
        )

    # ==================== Delegated Solana Send Operations ====================

    async def send_solana_transaction(
        self,
        transaction: str,
        network: str,
        address: str | None = None,
    ) -> SendSolanaTransaction200Response:
        """Send a Solana transaction using a delegation.

        Requires the end user to have created a delegation.

        Args:
            transaction: The base64-encoded unsigned Solana transaction.
            network: The target Solana network (e.g. "solana-devnet", "solana").
            address: The Solana address to send from. Defaults to the first Solana account.

        Returns:
            SendSolanaTransaction200Response: The transaction signature response.

        """
        track_action(action="end_user_send_solana_transaction")

        project_id = self._require_project_id()
        address = address or self.__solana_account_objects[0].address
        return await self.__api_clients.embedded_wallets_core.send_solana_transaction_with_end_user_account(
            project_id=project_id,
            user_id=self.__user_id,
            send_solana_transaction_with_end_user_account_request=SendSolanaTransactionWithEndUserAccountRequest(
                transaction=transaction,
                address=address,
                network=network,
            ),
        )

    async def send_solana_asset(
        self,
        to: str,
        amount: str,
        network: str,
        address: str | None = None,
        asset: str = "usdc",
    ) -> SendSolanaAssetWithEndUserAccount200Response:
        """Send a Solana asset (e.g. USDC) using a delegation.

        Requires the end user to have created a delegation.

        Args:
            to: The recipient address.
            amount: The amount to send.
            network: The target Solana network (e.g. "solana-devnet", "solana").
            address: The Solana address to send from. Defaults to the first Solana account.
            asset: The asset to send. Defaults to "usdc".

        Returns:
            SendSolanaAssetWithEndUserAccount200Response: The transaction signature response.

        """
        track_action(action="end_user_send_solana_asset")

        project_id = self._require_project_id()
        address = address or self.__solana_account_objects[0].address
        return await self.__api_clients.embedded_wallets_core.send_solana_asset_with_end_user_account(
            project_id=project_id,
            user_id=self.__user_id,
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
        network: str,
        address: str | None = None,
        enable_spend_permissions: bool = False,
    ) -> CreateEvmEip7702Delegation201Response:
        """Create an EIP-7702 delegation for an EVM account.

        Upgrades the EVM EOA with smart account capabilities.
        Requires the end user to have created a delegation.

        Args:
            network: The target EVM network (e.g. "base-sepolia", "base").
            address: The EVM address to delegate. Defaults to the first EVM account.
            enable_spend_permissions: Whether to enable spend permissions. Defaults to False.

        Returns:
            CreateEvmEip7702Delegation201Response: The delegation operation ID.

        """
        track_action(action="end_user_create_evm_eip7702_delegation")

        project_id = self._require_project_id()
        address = address or self.__evm_account_objects[0].address
        return await self.__api_clients.embedded_wallets_core.create_evm_eip7702_delegation_with_end_user_account(
            project_id=project_id,
            user_id=self.__user_id,
            create_evm_eip7702_delegation_with_end_user_account_request=CreateEvmEip7702DelegationWithEndUserAccountRequest(
                address=address,
                network=network,
                enable_spend_permissions=enable_spend_permissions,
            ),
        )

    async def revoke_delegation(self) -> None:
        """Revoke all active delegations for this end user.

        After revocation, the developer can no longer sign on behalf of this
        end user until a new delegation is created.
        """
        track_action(action="end_user_revoke_delegation")

        project_id = self._require_project_id()
        await self.__api_clients.embedded_wallets_core.revoke_delegation_for_end_user(
            project_id=project_id,
            user_id=self.__user_id,
            revoke_delegation_for_end_user_request=RevokeDelegationForEndUserRequest(),
        )
