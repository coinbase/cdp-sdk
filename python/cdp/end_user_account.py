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
from cdp.openapi_client.models.create_evm_eip7702_delegation_with_end_user_account201_response import (
    CreateEvmEip7702DelegationWithEndUserAccount201Response,
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


class EndUserAccount(BaseModel):
    """A class representing an end user with action methods.

    This wraps the OpenAPI EndUser model and adds convenience methods for
    adding accounts directly on the object.
    """

    model_config = ConfigDict(arbitrary_types_allowed=True)

    def __init__(
        self,
        end_user_model: EndUserModel,
        api_clients: ApiClients,
    ) -> None:
        """Initialize the EndUserAccount class.

        Args:
            end_user_model (EndUserModel): The end user model from the API.
            api_clients (ApiClients): The API clients.

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

    async def add_evm_account(self) -> AddEndUserEvmAccount201Response:
        """Add an EVM EOA (Externally Owned Account) to this end user.

        End users can have up to 10 EVM accounts.

        Returns:
            AddEndUserEvmAccount201Response: The result containing the newly created EVM EOA account.

        Example:
            >>> end_user = await cdp.end_user.create_end_user(
            ...     authentication_methods=[AuthenticationMethod(type="email", email="user@example.com")]
            ... )
            >>> result = await end_user.add_evm_account()
            >>> print(result.evm_account.address)

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

        Example:
            >>> end_user = await cdp.end_user.create_end_user(
            ...     authentication_methods=[AuthenticationMethod(type="email", email="user@example.com")]
            ... )
            >>> result = await end_user.add_evm_smart_account(enable_spend_permissions=True)
            >>> print(result.evm_smart_account.address)

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

        Example:
            >>> end_user = await cdp.end_user.create_end_user(
            ...     authentication_methods=[AuthenticationMethod(type="email", email="user@example.com")]
            ... )
            >>> result = await end_user.add_solana_account()
            >>> print(result.solana_account.address)

        """
        track_action(action="end_user_add_solana_account")

        return await self.__api_clients.end_user.add_end_user_solana_account(
            user_id=self.__user_id,
            body={},
        )

    # ─── Address Resolvers ───

    def _resolve_evm_address(self, override: str | None = None) -> str:
        """Resolve the EVM EOA address, using the first account if no override provided.

        Args:
            override: An optional explicit address to use.

        Returns:
            str: The resolved EVM address.

        Raises:
            ValueError: If no EVM account exists and no override was provided.

        """
        address = override or (
            self.__evm_account_objects[0].address if self.__evm_account_objects else None
        )
        if not address:
            raise ValueError(
                "No EVM account found on this end user. "
                "Provide an explicit address or add an EVM account first."
            )
        return address

    def _resolve_evm_smart_account_address(self, override: str | None = None) -> str:
        """Resolve the EVM smart account address, using the first account if no override provided.

        Args:
            override: An optional explicit address to use.

        Returns:
            str: The resolved EVM smart account address.

        Raises:
            ValueError: If no EVM smart account exists and no override was provided.

        """
        address = override or (
            self.__evm_smart_account_objects[0].address
            if self.__evm_smart_account_objects
            else None
        )
        if not address:
            raise ValueError(
                "No EVM smart account found on this end user. "
                "Provide an explicit address or add an EVM smart account first."
            )
        return address

    def _resolve_solana_address(self, override: str | None = None) -> str:
        """Resolve the Solana address, using the first account if no override provided.

        Args:
            override: An optional explicit address to use.

        Returns:
            str: The resolved Solana address.

        Raises:
            ValueError: If no Solana account exists and no override was provided.

        """
        address = override or (
            self.__solana_account_objects[0].address if self.__solana_account_objects else None
        )
        if not address:
            raise ValueError(
                "No Solana account found on this end user. "
                "Provide an explicit address or add a Solana account first."
            )
        return address

    # ─── Delegation Management ───

    async def revoke_delegation(self) -> None:
        """Revoke all active delegations for this end user.

        Example:
            >>> await end_user.revoke_delegation()

        """
        track_action(action="end_user_revoke_delegation")

        await self.__api_clients.embedded_wallets.revoke_delegation_for_end_user(
            user_id=self.__user_id,
            revoke_delegation_for_end_user_request=RevokeDelegationForEndUserRequest(),
        )

    # ─── Delegated EVM Sign Methods ───

    async def sign_evm_transaction(
        self,
        transaction: str,
        address: str | None = None,
    ) -> SignEvmTransactionWithEndUserAccount200Response:
        """Sign an EVM transaction on behalf of this end user.

        Args:
            transaction: The RLP-encoded unsigned transaction.
            address: Optional 0x-prefixed address. Defaults to the first EVM account.

        Returns:
            SignEvmTransactionWithEndUserAccount200Response: The signed transaction result.

        """
        track_action(action="end_user_sign_evm_transaction")

        resolved_address = self._resolve_evm_address(address)
        return await self.__api_clients.embedded_wallets.sign_evm_transaction_with_end_user_account(
            user_id=self.__user_id,
            sign_evm_transaction_with_end_user_account_request=SignEvmTransactionWithEndUserAccountRequest(
                address=resolved_address,
                transaction=transaction,
            ),
        )

    async def sign_evm_message(
        self,
        message: str,
        address: str | None = None,
    ) -> SignEvmMessageWithEndUserAccount200Response:
        """Sign an EVM message (EIP-191) on behalf of this end user.

        Args:
            message: The message to sign.
            address: Optional 0x-prefixed address. Defaults to the first EVM account.

        Returns:
            SignEvmMessageWithEndUserAccount200Response: The signature result.

        """
        track_action(action="end_user_sign_evm_message")

        resolved_address = self._resolve_evm_address(address)
        return await self.__api_clients.embedded_wallets.sign_evm_message_with_end_user_account(
            user_id=self.__user_id,
            sign_evm_message_with_end_user_account_request=SignEvmMessageWithEndUserAccountRequest(
                address=resolved_address,
                message=message,
            ),
        )

    async def sign_evm_typed_data(
        self,
        typed_data: object,
        address: str | None = None,
    ) -> SignEvmTypedDataWithEndUserAccount200Response:
        """Sign EVM EIP-712 typed data on behalf of this end user.

        Args:
            typed_data: The EIP-712 typed data object.
            address: Optional 0x-prefixed address. Defaults to the first EVM account.

        Returns:
            SignEvmTypedDataWithEndUserAccount200Response: The signature result.

        """
        track_action(action="end_user_sign_evm_typed_data")

        resolved_address = self._resolve_evm_address(address)
        return await self.__api_clients.embedded_wallets.sign_evm_typed_data_with_end_user_account(
            user_id=self.__user_id,
            sign_evm_typed_data_with_end_user_account_request=SignEvmTypedDataWithEndUserAccountRequest(
                address=resolved_address,
                typed_data=typed_data,
            ),
        )

    # ─── Delegated EVM Send Methods ───

    async def send_evm_transaction(
        self,
        transaction: str,
        network: str,
        address: str | None = None,
    ) -> SendEvmTransactionWithEndUserAccount200Response:
        """Send an EVM transaction on behalf of this end user.

        Args:
            transaction: The RLP-encoded unsigned transaction.
            network: The EVM network to send the transaction on.
            address: Optional 0x-prefixed address. Defaults to the first EVM account.

        Returns:
            SendEvmTransactionWithEndUserAccount200Response: The transaction result.

        """
        track_action(action="end_user_send_evm_transaction")

        resolved_address = self._resolve_evm_address(address)
        return await self.__api_clients.embedded_wallets.send_evm_transaction_with_end_user_account(
            user_id=self.__user_id,
            send_evm_transaction_with_end_user_account_request=SendEvmTransactionWithEndUserAccountRequest(
                address=resolved_address,
                transaction=transaction,
                network=network,
            ),
        )

    async def send_evm_asset(
        self,
        to: str,
        amount: str,
        network: str,
        asset: str = "usdc",
        address: str | None = None,
        use_cdp_paymaster: bool | None = None,
        paymaster_url: str | None = None,
    ) -> SendEvmAssetWithEndUserAccount200Response:
        """Send an EVM asset (e.g. USDC) on behalf of this end user.

        Args:
            to: The 0x-prefixed address of the recipient.
            amount: The amount to send as a decimal string (e.g., "1.5").
            network: The EVM network to send the asset on.
            asset: The asset to send. Defaults to "usdc".
            address: Optional 0x-prefixed address. Defaults to the first EVM account.
            use_cdp_paymaster: Whether to use CDP Paymaster for gas sponsorship.
            paymaster_url: Optional custom Paymaster URL.

        Returns:
            SendEvmAssetWithEndUserAccount200Response: The transaction result.

        """
        track_action(action="end_user_send_evm_asset")

        resolved_address = self._resolve_evm_address(address)
        return await self.__api_clients.embedded_wallets.send_evm_asset_with_end_user_account(
            user_id=self.__user_id,
            address=resolved_address,
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
        network: str,
        calls: list,
        address: str | None = None,
        use_cdp_paymaster: bool | None = None,
        paymaster_url: str | None = None,
        data_suffix: str | None = None,
    ) -> EvmUserOperation:
        """Send a user operation on behalf of this end user's smart account.

        Args:
            network: The EVM network.
            calls: The list of calls to execute.
            address: Optional smart account address. Defaults to the first EVM smart account.
            use_cdp_paymaster: Whether to use CDP Paymaster for gas sponsorship.
            paymaster_url: Optional custom Paymaster URL.
            data_suffix: Optional data suffix for the user operation.

        Returns:
            EvmUserOperation: The user operation result.

        """
        track_action(action="end_user_send_user_operation")

        resolved_address = self._resolve_evm_smart_account_address(address)
        return await self.__api_clients.embedded_wallets.send_user_operation_with_end_user_account(
            user_id=self.__user_id,
            address=resolved_address,
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
        network: str,
        address: str | None = None,
        enable_spend_permissions: bool | None = None,
    ) -> CreateEvmEip7702DelegationWithEndUserAccount201Response:
        """Create an EVM EIP-7702 delegation for this end user.

        Args:
            network: The EVM network.
            address: Optional 0x-prefixed address. Defaults to the first EVM account.
            enable_spend_permissions: If true, enables spend permissions.

        Returns:
            CreateEvmEip7702DelegationWithEndUserAccount201Response: The delegation result.

        """
        track_action(action="end_user_create_evm_eip7702_delegation")

        resolved_address = self._resolve_evm_address(address)
        return await self.__api_clients.embedded_wallets.create_evm_eip7702_delegation_with_end_user_account(
            user_id=self.__user_id,
            create_evm_eip7702_delegation_with_end_user_account_request=CreateEvmEip7702DelegationWithEndUserAccountRequest(
                address=resolved_address,
                network=network,
                enable_spend_permissions=enable_spend_permissions,
            ),
        )

    # ─── Delegated Solana Sign Methods ───

    async def sign_solana_message(
        self,
        message: str,
        address: str | None = None,
    ) -> SignSolanaMessageWithEndUserAccount200Response:
        """Sign a Solana message on behalf of this end user.

        Args:
            message: The base64 encoded message to sign.
            address: Optional base58 encoded address. Defaults to the first Solana account.

        Returns:
            SignSolanaMessageWithEndUserAccount200Response: The signature result.

        """
        track_action(action="end_user_sign_solana_message")

        resolved_address = self._resolve_solana_address(address)
        return await self.__api_clients.embedded_wallets.sign_solana_message_with_end_user_account(
            user_id=self.__user_id,
            sign_solana_message_with_end_user_account_request=SignSolanaMessageWithEndUserAccountRequest(
                address=resolved_address,
                message=message,
            ),
        )

    async def sign_solana_transaction(
        self,
        transaction: str,
        address: str | None = None,
    ) -> SignSolanaTransactionWithEndUserAccount200Response:
        """Sign a Solana transaction on behalf of this end user.

        Args:
            transaction: The base64 encoded transaction to sign.
            address: Optional base58 encoded address. Defaults to the first Solana account.

        Returns:
            SignSolanaTransactionWithEndUserAccount200Response: The signed transaction result.

        """
        track_action(action="end_user_sign_solana_transaction")

        resolved_address = self._resolve_solana_address(address)
        return await self.__api_clients.embedded_wallets.sign_solana_transaction_with_end_user_account(
            user_id=self.__user_id,
            sign_solana_transaction_with_end_user_account_request=SignSolanaTransactionWithEndUserAccountRequest(
                address=resolved_address,
                transaction=transaction,
            ),
        )

    # ─── Delegated Solana Send Methods ───

    async def send_solana_transaction(
        self,
        transaction: str,
        network: str,
        address: str | None = None,
    ) -> SendSolanaTransactionWithEndUserAccount200Response:
        """Send a Solana transaction on behalf of this end user.

        Args:
            transaction: The base64 encoded transaction.
            network: The Solana network.
            address: Optional base58 encoded address. Defaults to the first Solana account.

        Returns:
            SendSolanaTransactionWithEndUserAccount200Response: The transaction result.

        """
        track_action(action="end_user_send_solana_transaction")

        resolved_address = self._resolve_solana_address(address)
        return await self.__api_clients.embedded_wallets.send_solana_transaction_with_end_user_account(
            user_id=self.__user_id,
            send_solana_transaction_with_end_user_account_request=SendSolanaTransactionWithEndUserAccountRequest(
                address=resolved_address,
                transaction=transaction,
                network=network,
            ),
        )

    async def send_solana_asset(
        self,
        to: str,
        amount: str,
        network: str,
        asset: str = "usdc",
        address: str | None = None,
        create_recipient_ata: bool | None = None,
    ) -> SendSolanaTransactionWithEndUserAccount200Response:
        """Send a Solana asset (e.g. USDC) on behalf of this end user.

        Args:
            to: The base58 encoded address of the recipient.
            amount: The amount to send as a decimal string (e.g., "1.5").
            network: The Solana network.
            asset: The asset to send. Defaults to "usdc".
            address: Optional base58 encoded address. Defaults to the first Solana account.
            create_recipient_ata: Whether to create the recipient's Associated Token Account.

        Returns:
            SendSolanaTransactionWithEndUserAccount200Response: The transaction result.

        """
        track_action(action="end_user_send_solana_asset")

        resolved_address = self._resolve_solana_address(address)
        return await self.__api_clients.embedded_wallets.send_solana_asset_with_end_user_account(
            user_id=self.__user_id,
            address=resolved_address,
            asset=asset,
            send_solana_asset_with_end_user_account_request=SendSolanaAssetWithEndUserAccountRequest(
                to=to,
                amount=amount,
                network=network,
                create_recipient_ata=create_recipient_ata,
            ),
        )
