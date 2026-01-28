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
from cdp.openapi_client.models.end_user import EndUser as EndUserModel
from cdp.openapi_client.models.end_user_evm_account import EndUserEvmAccount
from cdp.openapi_client.models.end_user_evm_smart_account import EndUserEvmSmartAccount
from cdp.openapi_client.models.end_user_solana_account import EndUserSolanaAccount
from cdp.openapi_client.models.mfa_methods import MFAMethods


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
