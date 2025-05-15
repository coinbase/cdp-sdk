from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from cdp.actions.solana.request_faucet import request_faucet
from cdp.actions.solana.sign_message import sign_message
from cdp.actions.solana.sign_transaction import sign_transaction
from cdp.api_clients import ApiClients
from cdp.openapi_client.models.request_solana_faucet200_response import (
    RequestSolanaFaucet200Response as RequestSolanaFaucetResponse,
)
from cdp.openapi_client.models.sign_solana_message200_response import (
    SignSolanaMessage200Response as SignSolanaMessageResponse,
)
from cdp.openapi_client.models.sign_solana_transaction200_response import (
    SignSolanaTransaction200Response as SignSolanaTransactionResponse,
)
from cdp.openapi_client.models.solana_account import SolanaAccount as SolanaAccountModel


class SolanaAccount(BaseModel):
    """A class representing a Solana account."""

    model_config = ConfigDict(arbitrary_types_allowed=True)

    def __init__(
        self,
        solana_account_model: SolanaAccountModel,
        api_clients: ApiClients,
    ) -> None:
        """Initialize the SolanaAccount class.

        Args:
            solana_account_model (SolanaAccountModel): The Solana account model.
            api_clients (ApiClients): The API clients.

        """
        super().__init__()

        self.__address = solana_account_model.address
        self.__name = solana_account_model.name
        self.__policies = solana_account_model.policies
        self.__api_clients = api_clients

    def __str__(self) -> str:
        """Get the string representation of the Solana account.

        Returns:
            str: The string representation of the Solana account.

        """
        return f"Solana Account Address: {self.__address}"

    def __repr__(self) -> str:
        """Get the repr representation of the Solana account.

        Returns:
            str: The repr representation of the Solana account.

        """
        return f"Solana Account Address: {self.__address}"

    @property
    def address(self) -> str:
        """Get the address of the Solana account.

        Returns:
            str: The address of the Solana account.

        """
        return self.__address

    @property
    def name(self) -> str | None:
        """Get the name of the Solana account.

        Returns:
            str | None: The name of the Solana account.

        """
        return self.__name

    @property
    def policies(self) -> list[str]:
        """Get the list of policies the apply to this account.

        Returns:
            str: The list of Policy IDs.

        """
        return self.__policies

    async def request_faucet(self, token: Literal["sol", "usdc"]) -> RequestSolanaFaucetResponse:
        """Request a faucet for the Solana account.

        Args:
            token (str): The token to request the faucet for.

        Returns:
            RequestSolanaFaucetResponse: The response from the faucet.

        """
        return await request_faucet(
            self.__api_clients.faucets,
            self.__address,
            token,
        )

    async def sign_message(
        self, message: str, idempotency_key: str | None = None
    ) -> SignSolanaMessageResponse:
        """Sign a message.

        Args:
            message (str): The message to sign.
            idempotency_key (str, optional): The optional idempotency key.

        Returns:
            SignSolanaMessageResponse: The signature of the message.

        """
        return await sign_message(
            self.__api_clients.solana_accounts,
            self.__address,
            message,
            idempotency_key,
        )

    async def sign_transaction(
        self, transaction: str, idempotency_key: str | None = None
    ) -> SignSolanaTransactionResponse:
        """Sign a transaction.

        Args:
            transaction (str): The transaction to sign.
            idempotency_key (str, optional): The optional idempotency key.

        Returns:
            SignSolanaTransactionResponse: The signature of the transaction.

        """
        return await sign_transaction(
            self.__api_clients.solana_accounts,
            self.__address,
            transaction,
            idempotency_key,
        )

    async def transfer(
        self,
        to: str,
        amount: int,
        token: str,
        network: str,
    ) -> str:
        """Transfer a token from the Solana account to a destination address.

        Args:
            to: The account or 0x-prefixed address to transfer the token to.
            amount: The amount to transfer in atomic units of the token. For example, 0.01 * LAMPORTS_PER_SOL would transfer 0.01 SOL.
            token: The token to transfer.
            network: The network to transfer the token on.

        Returns:
            str: The signature of the transaction.

        """
        from cdp.actions.solana.transfer import TransferOptions, transfer

        transfer_args = TransferOptions(
            from_account=self.__address,
            to_account=to,
            amount=amount,
            token=token,
            network=network,
        )

        return await transfer(
            self.__api_clients,
            transfer_args,
        )


class ListSolanaAccountsResponse(BaseModel):
    """Response model for listing Solana accounts."""

    accounts: list[SolanaAccount] = Field(description="List of Solana accounts models.")
    next_page_token: str | None = Field(
        None,
        description="Token for the next page of results. If None, there are no more results.",
    )

    model_config = ConfigDict(arbitrary_types_allowed=True)
