from pydantic import BaseModel, Field

from cdp.analytics import track_action, track_error
from cdp.api_clients import ApiClients
from cdp.openapi_client.models.lend_position import LendPosition
from cdp.openapi_client.models.vault import Vault


class ListVaultsResult(BaseModel):
    """The result of listing vaults."""

    vaults: list[Vault] = Field(description="The vaults created by the project.")
    next_page_token: str | None = Field(
        None,
        description="The page token to fetch the next page of vaults. "
        "If None, there are no more vaults to fetch.",
    )


class ListLendPositionsResult(BaseModel):
    """The result of listing lend positions."""

    lend_positions: list[LendPosition] = Field(description="The lend positions on this page.")
    next_page_token: str | None = Field(
        None,
        description="The page token to fetch the next page of lend positions. "
        "If None, there are no more lend positions to fetch.",
    )


class LendClient:
    """Client for reading the project's Lend vaults and lend positions."""

    def __init__(self, api_clients: ApiClients):
        self.api_clients = api_clients

    async def list_vaults(
        self,
        page_size: int | None = None,
        page_token: str | None = None,
    ) -> ListVaultsResult:
        """List the vaults the project created.

        Each vault includes its current metrics, such as APY and TVL, once a
        metrics snapshot has been observed for it.

        Args:
            page_size (int | None, optional): The number of vaults to return per page,
                between 1 and 1000. Defaults to 20 on the server.
            page_token (str | None, optional): The page token from a previous response.

        Returns:
            ListVaultsResult: A page of vaults.

        Example:
            .. code-block:: python

                async with CdpClient() as cdp:
                    result = await cdp.lend.list_vaults(page_size=10)
                    for vault in result.vaults:
                        print(vault.vault_id, vault.status)

        """
        track_action(action="list_vaults")

        try:
            response = await self.api_clients.lend.list_vaults(
                page_size=page_size,
                page_token=page_token,
            )
            return ListVaultsResult(
                vaults=response.vaults,
                next_page_token=response.next_page_token,
            )
        except Exception as error:
            track_error(error, "list_vaults")
            raise

    async def get_vault(self, vault_id: str) -> Vault:
        """Get a vault the project created.

        Args:
            vault_id (str): The ID of the vault, for example
                ``vault_019f5f10-096a-7a23-86df-f479650d813f``.

        Returns:
            Vault: The vault, including its current metrics such as APY and TVL.

        Example:
            .. code-block:: python

                async with CdpClient() as cdp:
                    vault = await cdp.lend.get_vault(
                        "vault_019f5f10-096a-7a23-86df-f479650d813f"
                    )
                    print(vault.address, vault.metrics)

        """
        track_action(action="get_vault")

        try:
            return await self.api_clients.lend.get_vault(vault_id=vault_id)
        except Exception as error:
            track_error(error, "get_vault")
            raise

    async def list_lend_positions(
        self,
        address: str,
        vault_ids: list[str] | None = None,
        page_size: int | None = None,
        page_token: str | None = None,
    ) -> ListLendPositionsResult:
        """List the lend positions of an EVM account or EVM smart account in the project.

        When ``vault_ids`` is omitted, only vaults where the address received
        shares through a Lend deposit are listed, so an empty list does not
        mean the address holds no shares.

        Args:
            address (str): The address of the EVM account or EVM smart account.
            vault_ids (list[str] | None, optional): The project-owned vaults to read,
                between 1 and 100 IDs.
            page_size (int | None, optional): The number of positions to return per page,
                between 1 and 100. Defaults to 20 on the server.
            page_token (str | None, optional): The page token from a previous response.
                Keep ``address`` and ``vault_ids`` unchanged when following it.

        Returns:
            ListLendPositionsResult: A page of lend positions, ordered by vault ID.

        Example:
            .. code-block:: python

                async with CdpClient() as cdp:
                    result = await cdp.lend.list_lend_positions(
                        "0x742d35Cc6634C0532925a3b844Bc454e4438f44e"
                    )
                    for position in result.lend_positions:
                        print(position.vault_id, position.asset_balance)

        """
        track_action(action="list_lend_positions")

        try:
            response = await self.api_clients.lend.list_lend_positions(
                address=address,
                vault_ids=vault_ids,
                page_size=page_size,
                page_token=page_token,
            )
            return ListLendPositionsResult(
                lend_positions=response.lend_positions,
                next_page_token=response.next_page_token,
            )
        except Exception as error:
            track_error(error, "list_lend_positions")
            raise
