from eth_account.signers.base import BaseAccount
from pydantic import BaseModel, ConfigDict, Field

from cdp.openapi_client.models.evm_smart_account import EvmSmartAccount as EvmSmartAccountModel


class EvmSmartAccount:
    """A class representing an EVM smart account."""

    def __init__(
        self,
        address: str,
        owner: BaseAccount,
        name: str | None = None,
    ) -> None:
        """Initialize the EvmSmartAccount class.

        Args:
            address (str): The address of the smart account.
            owner (BaseAccount): The owner of the smart account.
            name (str | None): The name of the smart account.

        """
        self.__address = address
        self.__owners = [owner]
        self.__name = name

    @property
    def address(self) -> str:
        """Get the Smart Account Address.

        Returns:
            str: The Smart Account Address.

        """
        return self.__address

    @property
    def owners(self) -> list[BaseAccount]:
        """Get the account owners.

        Returns:
            List[BaseAccount]: List of owner accounts

        """
        return self.__owners

    @property
    def name(self) -> str | None:
        """Get the name of the smart account.

        Returns:
            str | None: The name of the smart account.

        """
        return self.__name

    def __str__(self) -> str:
        """Return a string representation of the EthereumAccount object.

        Returns:
            str: A string representation of the EthereumAccount.

        """
        return f"Smart Account Address: {self.address}"

    def __repr__(self) -> str:
        """Return a string representation of the SmartAccount object.

        Returns:
            str: A string representation of the SmartAccount.

        """
        return str(self)

    @classmethod
    def to_evm_smart_account(
        cls, address: str, owner: BaseAccount, name: str | None = None
    ) -> "EvmSmartAccount":
        """Construct an existing smart account by its address and the owner.

        Args:
            address (str): The address of the evm smart account to retrieve.
            owner (BaseAccount): The owner of the evm smart account.
            name (str | None): The name of the evm smart account.

        Returns:
            EvmSmartAccount: The retrieved EvmSmartAccount object.

        Raises:
            Exception: If there's an error retrieving the EvmSmartAccount.

        """
        return cls(address, owner, name)


class ListEvmSmartAccountsResponse(BaseModel):
    """Response model for listing EVM smart accounts."""

    accounts: list[EvmSmartAccountModel] = Field(description="List of EVM smart accounts models.")
    next_page_token: str | None = Field(
        None,
        description="Token for the next page of results. If None, there are no more results.",
    )

    model_config = ConfigDict(arbitrary_types_allowed=True)
