from dataclasses import dataclass
from datetime import datetime

from pydantic import BaseModel, ConfigDict

from cdp.analytics import track_action
from cdp.api_clients import ApiClients
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
from cdp.openapi_client.models.create_evm_eip7702_delegation_with_end_user_account_request import (
    CreateEvmEip7702DelegationWithEndUserAccountRequest,
)
from cdp.openapi_client.models.eip712_message import EIP712Message
from cdp.openapi_client.models.end_user import EndUser as EndUserModel
from cdp.openapi_client.models.end_user_evm_account import EndUserEvmAccount
from cdp.openapi_client.models.end_user_evm_smart_account import EndUserEvmSmartAccount
from cdp.openapi_client.models.end_user_solana_account import EndUserSolanaAccount
from cdp.openapi_client.models.evm_call import EvmCall
from cdp.openapi_client.models.evm_eip7702_delegation_network import EvmEip7702DelegationNetwork
from cdp.openapi_client.models.evm_user_operation import EvmUserOperation
from cdp.openapi_client.models.evm_user_operation_network import EvmUserOperationNetwork
from cdp.openapi_client.models.mfa_methods import MFAMethods
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


@dataclass
class SendEvmAssetResult:
    """Result of sending an EVM asset from an end user account.

    Attributes:
        transaction_hash: The transaction hash for EOA accounts. None for Smart Accounts.
        user_op_hash: The user operation hash for Smart Accounts. None for EOA accounts.

    """

    transaction_hash: str | None
    user_op_hash: str | None


class EndUserAccount(BaseModel):
    """A class representing an end user with action methods.

    This wraps the OpenAPI EndUser model and adds convenience methods for
    adding accounts and performing signing and sending operations directly
    on the object.
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
            project_id (str | None): The CDP Project ID. Required for delegation operations.

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

    def _require_project_id(self) -> str:
        """Return the project ID or raise an error if it is not set.

        Returns:
            str: The project ID.

        Raises:
            UserInputValidationError: If the project ID is not configured.

        """
        if not self.__project_id:
            raise UserInputValidationError(
                "project_id is required for delegation operations. "
                "Set it via the CDP_PROJECT_ID environment variable or pass it as "
                "project_id to CdpClient."
            )
        return self.__project_id

    def _resolve_evm_address(self, address: str | None) -> str:
        """Resolve an EVM address, defaulting to the first account if not provided.

        Args:
            address: An explicit address, or None to use the first account.

        Returns:
            str: The resolved address.

        Raises:
            UserInputValidationError: If no EVM accounts exist on this end user.

        """
        if address is not None:
            return address
        if not self.__evm_accounts:
            raise UserInputValidationError(
                "This end user has no EVM accounts. Add one with add_evm_account() first."
            )
        return self.__evm_accounts[0]

    def _resolve_evm_smart_account_address(self, address: str | None) -> str:
        """Resolve an EVM Smart Account address, defaulting to the first if not provided.

        Args:
            address: An explicit address, or None to use the first smart account.

        Returns:
            str: The resolved address.

        Raises:
            UserInputValidationError: If no EVM smart accounts exist on this end user.

        """
        if address is not None:
            return address
        if not self.__evm_smart_accounts:
            raise UserInputValidationError(
                "This end user has no EVM smart accounts. Add one with add_evm_smart_account() first."
            )
        return self.__evm_smart_accounts[0]

    def _resolve_solana_address(self, address: str | None) -> str:
        """Resolve a Solana address, defaulting to the first account if not provided.

        Args:
            address: An explicit address, or None to use the first account.

        Returns:
            str: The resolved address.

        Raises:
            UserInputValidationError: If no Solana accounts exist on this end user.

        """
        if address is not None:
            return address
        if not self.__solana_accounts:
            raise UserInputValidationError(
                "This end user has no Solana accounts. Add one with add_solana_account() first."
            )
        return self.__solana_accounts[0]

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

    # -------------------------------------------------------------------------
    # Delegation convenience methods
    # -------------------------------------------------------------------------

    async def revoke_delegation(
        self,
        wallet_secret_id: str | None = None,
    ) -> None:
        """Revoke all active delegations for this end user.

        Args:
            wallet_secret_id: The ID of the Temporary Wallet Secret used to sign the
                X-Wallet-Auth header. Required when not using delegated signing.

        Example:
            >>> await end_user.revoke_delegation()

        """
        track_action(action="end_user_revoke_delegation")

        project_id = self._require_project_id()

        await self.__api_clients.embedded_wallets.revoke_delegation_for_end_user(
            project_id=project_id,
            user_id=self.__user_id,
            revoke_delegation_for_end_user_request=RevokeDelegationForEndUserRequest(
                wallet_secret_id=wallet_secret_id,
            ),
        )

    async def create_evm_eip7702_delegation(
        self,
        network: EvmEip7702DelegationNetwork,
        address: str | None = None,
        enable_spend_permissions: bool = False,
        wallet_secret_id: str | None = None,
    ) -> str:
        """Create an EIP-7702 delegation for this end user's EVM EOA account.

        Upgrades an EVM EOA with smart account capabilities. If `address` is not provided,
        the first EVM account on this end user is used.

        Args:
            network: The network on which to create the delegation.
            address: The 0x-prefixed EVM account address. Defaults to the first EVM account.
            enable_spend_permissions: Whether to configure spend permissions. Defaults to False.
            wallet_secret_id: The ID of the Temporary Wallet Secret. Required when not
                using delegated signing.

        Returns:
            str: The delegation operation ID. Use this to poll the operation status.

        Example:
            >>> op_id = await end_user.create_evm_eip7702_delegation(
            ...     network=EvmEip7702DelegationNetwork.BASE_SEPOLIA
            ... )

        """
        track_action(action="end_user_create_evm_eip7702_delegation")

        project_id = self._require_project_id()
        resolved_address = self._resolve_evm_address(address)

        result = await self.__api_clients.embedded_wallets.create_evm_eip7702_delegation_with_end_user_account(
            project_id=project_id,
            user_id=self.__user_id,
            create_evm_eip7702_delegation_with_end_user_account_request=CreateEvmEip7702DelegationWithEndUserAccountRequest(
                address=resolved_address,
                network=network,
                enable_spend_permissions=enable_spend_permissions,
                wallet_secret_id=wallet_secret_id,
            ),
        )

        return result.delegation_operation_id

    async def sign_evm_hash(
        self,
        hash: str,
        address: str | None = None,
        wallet_secret_id: str | None = None,
    ) -> str:
        """Sign an arbitrary 32-byte hash with this end user's EVM account.

        If `address` is not provided, the first EVM account on this end user is used.

        Args:
            hash: The arbitrary 32-byte hash to sign.
            address: The 0x-prefixed EVM account address. Defaults to the first EVM account.
            wallet_secret_id: The ID of the Temporary Wallet Secret. Required when not
                using delegated signing.

        Returns:
            str: The signature as a 0x-prefixed hex string.

        Example:
            >>> sig = await end_user.sign_evm_hash(hash="0xdeadbeef...")

        """
        track_action(action="end_user_sign_evm_hash")

        project_id = self._require_project_id()
        resolved_address = self._resolve_evm_address(address)

        result = await self.__api_clients.embedded_wallets.sign_evm_hash_with_end_user_account(
            project_id=project_id,
            user_id=self.__user_id,
            sign_evm_hash_with_end_user_account_request=SignEvmHashWithEndUserAccountRequest(
                hash=hash,
                address=resolved_address,
                wallet_secret_id=wallet_secret_id,
            ),
        )

        return result.signature

    async def sign_evm_message(
        self,
        message: str,
        address: str | None = None,
        wallet_secret_id: str | None = None,
    ) -> str:
        """Sign a message with this end user's EVM account (EIP-191).

        If `address` is not provided, the first EVM account on this end user is used.

        Args:
            message: The message to sign.
            address: The 0x-prefixed EVM account address. Defaults to the first EVM account.
            wallet_secret_id: The ID of the Temporary Wallet Secret. Required when not
                using delegated signing.

        Returns:
            str: The signature as a 0x-prefixed hex string.

        Example:
            >>> sig = await end_user.sign_evm_message(message="Hello, world!")

        """
        track_action(action="end_user_sign_evm_message")

        project_id = self._require_project_id()
        resolved_address = self._resolve_evm_address(address)

        result = await self.__api_clients.embedded_wallets.sign_evm_message_with_end_user_account(
            project_id=project_id,
            user_id=self.__user_id,
            sign_evm_message_with_end_user_account_request=SignEvmMessageWithEndUserAccountRequest(
                address=resolved_address,
                message=message,
                wallet_secret_id=wallet_secret_id,
            ),
        )

        return result.signature

    async def sign_evm_transaction(
        self,
        transaction: str,
        address: str | None = None,
        wallet_secret_id: str | None = None,
    ) -> str:
        """Sign an RLP-encoded EVM transaction with this end user's EVM account.

        If `address` is not provided, the first EVM account on this end user is used.

        Args:
            transaction: The RLP-encoded transaction to sign, as a 0x-prefixed hex string.
            address: The 0x-prefixed EVM account address. Defaults to the first EVM account.
            wallet_secret_id: The ID of the Temporary Wallet Secret. Required when not
                using delegated signing.

        Returns:
            str: The RLP-encoded signed transaction as a 0x-prefixed hex string.

        Example:
            >>> signed = await end_user.sign_evm_transaction(transaction="0x02...")

        """
        track_action(action="end_user_sign_evm_transaction")

        project_id = self._require_project_id()
        resolved_address = self._resolve_evm_address(address)

        result = await self.__api_clients.embedded_wallets.sign_evm_transaction_with_end_user_account(
            project_id=project_id,
            user_id=self.__user_id,
            sign_evm_transaction_with_end_user_account_request=SignEvmTransactionWithEndUserAccountRequest(
                address=resolved_address,
                transaction=transaction,
                wallet_secret_id=wallet_secret_id,
            ),
        )

        return result.signed_transaction

    async def sign_evm_typed_data(
        self,
        typed_data: EIP712Message,
        address: str | None = None,
        wallet_secret_id: str | None = None,
    ) -> str:
        """Sign EIP-712 typed data with this end user's EVM account.

        If `address` is not provided, the first EVM account on this end user is used.

        Args:
            typed_data: The EIP-712 typed data to sign.
            address: The 0x-prefixed EVM account address. Defaults to the first EVM account.
            wallet_secret_id: The ID of the Temporary Wallet Secret. Required when not
                using delegated signing.

        Returns:
            str: The signature as a 0x-prefixed hex string.

        Example:
            >>> sig = await end_user.sign_evm_typed_data(typed_data=my_eip712_message)

        """
        track_action(action="end_user_sign_evm_typed_data")

        project_id = self._require_project_id()
        resolved_address = self._resolve_evm_address(address)

        result = await self.__api_clients.embedded_wallets.sign_evm_typed_data_with_end_user_account(
            project_id=project_id,
            user_id=self.__user_id,
            sign_evm_typed_data_with_end_user_account_request=SignEvmTypedDataWithEndUserAccountRequest(
                address=resolved_address,
                typed_data=typed_data,
                wallet_secret_id=wallet_secret_id,
            ),
        )

        return result.signature

    async def send_evm_transaction(
        self,
        network: str,
        transaction: str,
        address: str | None = None,
        wallet_secret_id: str | None = None,
    ) -> str:
        """Sign and send an RLP-encoded EVM transaction for this end user.

        If `address` is not provided, the first EVM account on this end user is used.

        Args:
            network: The network to send the transaction to (e.g. "base", "base-sepolia").
            transaction: The RLP-encoded transaction to sign and send, as a 0x-prefixed hex string.
            address: The 0x-prefixed EVM account address. Defaults to the first EVM account.
            wallet_secret_id: The ID of the Temporary Wallet Secret. Required when not
                using delegated signing.

        Returns:
            str: The transaction hash as a 0x-prefixed hex string.

        Example:
            >>> tx_hash = await end_user.send_evm_transaction(
            ...     network="base-sepolia",
            ...     transaction="0x02..."
            ... )

        """
        track_action(action="end_user_send_evm_transaction")

        project_id = self._require_project_id()
        resolved_address = self._resolve_evm_address(address)

        result = await self.__api_clients.embedded_wallets.send_evm_transaction_with_end_user_account(
            project_id=project_id,
            user_id=self.__user_id,
            send_evm_transaction_with_end_user_account_request=SendEvmTransactionWithEndUserAccountRequest(
                address=resolved_address,
                network=network,
                transaction=transaction,
                wallet_secret_id=wallet_secret_id,
            ),
        )

        return result.transaction_hash

    async def send_evm_asset(
        self,
        network: str,
        to: str,
        amount: str,
        address: str | None = None,
        use_cdp_paymaster: bool | None = None,
        paymaster_url: str | None = None,
        wallet_secret_id: str | None = None,
    ) -> SendEvmAssetResult:
        """Send USDC from this end user's EVM account (EOA or Smart Account).

        If `address` is not provided, the first EVM account on this end user is used.

        Args:
            network: The EVM network to send USDC on (e.g. "base", "base-sepolia").
            to: The 0x-prefixed address of the recipient.
            amount: The amount of USDC to send as a decimal string (e.g. "1.5" or "25.50").
            address: The 0x-prefixed EVM account address. Defaults to the first EVM account.
            use_cdp_paymaster: Whether to use CDP Paymaster to sponsor gas fees. Only
                applicable for EVM Smart Accounts.
            paymaster_url: Custom Paymaster URL. Cannot be used together with use_cdp_paymaster.
            wallet_secret_id: The ID of the Temporary Wallet Secret. Required when not
                using delegated signing.

        Returns:
            SendEvmAssetResult: Contains transaction_hash (for EOA) or user_op_hash (for Smart Accounts).

        Example:
            >>> result = await end_user.send_evm_asset(
            ...     network="base-sepolia",
            ...     to="0xRecipient...",
            ...     amount="1.5"
            ... )
            >>> print(result.transaction_hash)

        """
        # Import here to avoid circular import
        from cdp.end_user_client import SendEvmAssetResult

        track_action(action="end_user_send_evm_asset")

        project_id = self._require_project_id()
        resolved_address = self._resolve_evm_address(address)

        result = await self.__api_clients.embedded_wallets.send_evm_asset_with_end_user_account(
            project_id=project_id,
            user_id=self.__user_id,
            address=resolved_address,
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
        network: EvmUserOperationNetwork,
        calls: list[EvmCall],
        use_cdp_paymaster: bool,
        address: str | None = None,
        paymaster_url: str | None = None,
        data_suffix: str | None = None,
        wallet_secret_id: str | None = None,
    ) -> EvmUserOperation:
        """Prepare, sign, and send a user operation from this end user's EVM Smart Account.

        If `address` is not provided, the first EVM smart account on this end user is used.

        Args:
            network: The network on which to send the user operation.
            calls: The list of calls to make from the Smart Account.
            use_cdp_paymaster: Whether to use the CDP Paymaster for gas sponsorship.
            address: The EVM Smart Account address. Defaults to the first smart account.
            paymaster_url: Custom Paymaster URL. Cannot be used together with use_cdp_paymaster.
            data_suffix: The EIP-8021 data suffix (hex-encoded) for transaction attribution.
            wallet_secret_id: The ID of the Temporary Wallet Secret. Required when not
                using delegated signing.

        Returns:
            EvmUserOperation: The submitted user operation.

        Example:
            >>> user_op = await end_user.send_user_operation(
            ...     network=EvmUserOperationNetwork.BASE_SEPOLIA,
            ...     calls=[EvmCall(to="0x...", value=0, data="0x")],
            ...     use_cdp_paymaster=True,
            ... )

        """
        track_action(action="end_user_send_user_operation")

        project_id = self._require_project_id()
        resolved_address = self._resolve_evm_smart_account_address(address)

        return await self.__api_clients.embedded_wallets.send_user_operation_with_end_user_account(
            project_id=project_id,
            user_id=self.__user_id,
            address=resolved_address,
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
        hash: str,
        address: str | None = None,
        wallet_secret_id: str | None = None,
    ) -> str:
        """Sign an arbitrary 32-byte hash with this end user's Solana account.

        If `address` is not provided, the first Solana account on this end user is used.

        Args:
            hash: The arbitrary 32-byte hash to sign, as a base58-encoded string.
            address: The base58-encoded Solana account address. Defaults to the first Solana account.
            wallet_secret_id: The ID of the Temporary Wallet Secret. Required when not
                using delegated signing.

        Returns:
            str: The signature as a base58-encoded string.

        Example:
            >>> sig = await end_user.sign_solana_hash(hash="...")

        """
        track_action(action="end_user_sign_solana_hash")

        project_id = self._require_project_id()
        resolved_address = self._resolve_solana_address(address)

        result = await self.__api_clients.embedded_wallets.sign_solana_hash_with_end_user_account(
            project_id=project_id,
            user_id=self.__user_id,
            sign_solana_hash_with_end_user_account_request=SignSolanaHashWithEndUserAccountRequest(
                hash=hash,
                address=resolved_address,
                wallet_secret_id=wallet_secret_id,
            ),
        )

        return result.signature

    async def sign_solana_message(
        self,
        message: str,
        address: str | None = None,
        wallet_secret_id: str | None = None,
    ) -> str:
        """Sign a message with this end user's Solana account.

        If `address` is not provided, the first Solana account on this end user is used.

        Args:
            message: The base64-encoded message to sign.
            address: The base58-encoded Solana account address. Defaults to the first Solana account.
            wallet_secret_id: The ID of the Temporary Wallet Secret. Required when not
                using delegated signing.

        Returns:
            str: The signature as a base58-encoded string.

        Example:
            >>> sig = await end_user.sign_solana_message(message="base64encodedmessage==")

        """
        track_action(action="end_user_sign_solana_message")

        project_id = self._require_project_id()
        resolved_address = self._resolve_solana_address(address)

        result = await self.__api_clients.embedded_wallets.sign_solana_message_with_end_user_account(
            project_id=project_id,
            user_id=self.__user_id,
            sign_solana_message_with_end_user_account_request=SignSolanaMessageWithEndUserAccountRequest(
                address=resolved_address,
                message=message,
                wallet_secret_id=wallet_secret_id,
            ),
        )

        return result.signature

    async def sign_solana_transaction(
        self,
        transaction: str,
        address: str | None = None,
        wallet_secret_id: str | None = None,
    ) -> str:
        """Sign a Solana transaction with this end user's Solana account.

        If `address` is not provided, the first Solana account on this end user is used.

        Args:
            transaction: The base64-encoded transaction to sign.
            address: The base58-encoded Solana account address. Defaults to the first Solana account.
            wallet_secret_id: The ID of the Temporary Wallet Secret. Required when not
                using delegated signing.

        Returns:
            str: The base64-encoded signed transaction.

        Example:
            >>> signed = await end_user.sign_solana_transaction(transaction="base64tx==")

        """
        track_action(action="end_user_sign_solana_transaction")

        project_id = self._require_project_id()
        resolved_address = self._resolve_solana_address(address)

        result = await self.__api_clients.embedded_wallets.sign_solana_transaction_with_end_user_account(
            project_id=project_id,
            user_id=self.__user_id,
            sign_solana_transaction_with_end_user_account_request=SignSolanaTransactionWithEndUserAccountRequest(
                address=resolved_address,
                transaction=transaction,
                wallet_secret_id=wallet_secret_id,
            ),
        )

        return result.signed_transaction

    async def send_solana_transaction(
        self,
        network: str,
        transaction: str,
        address: str | None = None,
        use_cdp_sponsor: bool | None = None,
        wallet_secret_id: str | None = None,
    ) -> str:
        """Sign and send a Solana transaction for this end user.

        If `address` is not provided, the first Solana account on this end user is used.

        Args:
            network: The Solana network (e.g. "solana", "solana-devnet").
            transaction: The base64-encoded transaction to sign and send.
            address: The base58-encoded Solana account address. Defaults to the first Solana account.
            use_cdp_sponsor: Whether CDP sponsors the transaction fees on behalf of the end user.
            wallet_secret_id: The ID of the Temporary Wallet Secret. Required when not
                using delegated signing.

        Returns:
            str: The base58-encoded transaction signature.

        Example:
            >>> sig = await end_user.send_solana_transaction(
            ...     network="solana-devnet",
            ...     transaction="base64tx=="
            ... )

        """
        track_action(action="end_user_send_solana_transaction")

        project_id = self._require_project_id()
        resolved_address = self._resolve_solana_address(address)

        result = await self.__api_clients.embedded_wallets.send_solana_transaction_with_end_user_account(
            project_id=project_id,
            user_id=self.__user_id,
            send_solana_transaction_with_end_user_account_request=SendSolanaTransactionWithEndUserAccountRequest(
                address=resolved_address,
                network=network,
                transaction=transaction,
                use_cdp_sponsor=use_cdp_sponsor,
                wallet_secret_id=wallet_secret_id,
            ),
        )

        return result.transaction_signature

    async def send_solana_asset(
        self,
        network: str,
        to: str,
        amount: str,
        address: str | None = None,
        create_recipient_ata: bool | None = None,
        use_cdp_sponsor: bool | None = None,
        wallet_secret_id: str | None = None,
    ) -> str:
        """Send USDC from this end user's Solana account.

        If `address` is not provided, the first Solana account on this end user is used.

        Args:
            network: The Solana network (e.g. "solana", "solana-devnet").
            to: The base58-encoded address of the recipient.
            amount: The amount of USDC to send as a decimal string (e.g. "1.5" or "25.50").
            address: The base58-encoded Solana account address. Defaults to the first Solana account.
            create_recipient_ata: Whether to automatically create an Associated Token Account
                for the recipient if it doesn't exist.
            use_cdp_sponsor: Whether CDP sponsors the transaction fees on behalf of the end user.
            wallet_secret_id: The ID of the Temporary Wallet Secret. Required when not
                using delegated signing.

        Returns:
            str: The base58-encoded transaction signature.

        Example:
            >>> sig = await end_user.send_solana_asset(
            ...     network="solana-devnet",
            ...     to="RecipientAddress...",
            ...     amount="1.5"
            ... )

        """
        track_action(action="end_user_send_solana_asset")

        project_id = self._require_project_id()
        resolved_address = self._resolve_solana_address(address)

        result = await self.__api_clients.embedded_wallets.send_solana_asset_with_end_user_account(
            project_id=project_id,
            user_id=self.__user_id,
            address=resolved_address,
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
