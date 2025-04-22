from eth_account.signers.base import BaseAccount

from cdp.actions.evm.send_user_operation import send_user_operation
from cdp.actions.evm.wait_for_user_operation import wait_for_user_operation
from cdp.api_clients import ApiClients
from cdp.evm_call_types import ContractCall, EncodedCall
from cdp.evm_server_account import EvmServerAccount
from cdp.evm_smart_account import EvmSmartAccount
from cdp.openapi_client.models.create_evm_account_request import CreateEvmAccountRequest
from cdp.openapi_client.models.create_evm_smart_account_request import (
    CreateEvmSmartAccountRequest,
)
from cdp.openapi_client.models.evm_call import EvmCall
from cdp.openapi_client.models.evm_user_operation import EvmUserOperation
from cdp.openapi_client.models.prepare_user_operation_request import (
    PrepareUserOperationRequest,
)
from cdp.openapi_client.models.request_evm_faucet_request import RequestEvmFaucetRequest
from cdp.openapi_client.models.sign_evm_hash_request import SignEvmHashRequest
from cdp.openapi_client.models.sign_evm_message_request import SignEvmMessageRequest
from cdp.openapi_client.models.sign_evm_transaction_request import (
    SignEvmTransactionRequest,
)


class EvmClient:
    """The EvmClient class is responsible for CDP API calls for the EVM."""

    def __init__(self, api_clients: ApiClients):
        self.api_clients = api_clients

    async def create_account(self, name: str | None = None, idempotency_key: str | None = None):
        """Create an EVM account.

        Args:
            name (str, optional): The name. Defaults to None.
            idempotency_key (str, optional): The idempotency key. Defaults to None.

        """
        evm_account = await self.api_clients.evm_accounts.create_evm_account(
            x_idempotency_key=idempotency_key,
            create_evm_account_request=CreateEvmAccountRequest(name=name),
        )
        return EvmServerAccount(evm_account, self.api_clients.evm_accounts)

    async def list_accounts(
        self,
        page_size: int | None = None,
        page_token: str | None = None,
    ):
        """List all EVM accounts.

        Args:
            page_size (int, optional): The number of accounts to return per page. Defaults to None.
            page_token (str, optional): The token for the next page of accounts, if any. Defaults to None.

        Returns:
            List[EvmServerAccount]: List of EVM server accounts.

        """
        response = await self.api_clients.evm_accounts.list_evm_accounts(
            page_size=page_size, page_token=page_token
        )
        evm_server_accounts = [
            EvmServerAccount(account, self.api_clients.evm_accounts)
            for account in response.accounts
        ]
        return {
            "evm_accounts": evm_server_accounts,
            "next_page_token": response.next_page_token,
        }

    async def get_account(self, address: str | None = None, name: str | None = None):
        """Get an EVM account by address.

        Args:
            address (str, optional): The address of the account.
            name (str, optional): The name of the account.

        Returns:
            EvmServerAccount: The EVM server account.

        """
        if address:
            evm_account = await self.api_clients.evm_accounts.get_evm_account(address)
        elif name:
            evm_account = await self.api_clients.evm_accounts.get_evm_account_by_name(name)
        else:
            raise ValueError("Either address or name must be provided")
        return EvmServerAccount(evm_account, self.api_clients.evm_accounts)

    async def sign_hash(self, address: str, hash: str, idempotency_key: str | None = None):
        """Sign an EVM hash.

        Args:
            address (str): The address of the account.
            hash (str): The hash to sign.
            idempotency_key (str, optional): The idempotency key. Defaults to None.

        """
        return await self.api_clients.evm_accounts.sign_evm_hash(
            address=address,
            sign_evm_hash_request=SignEvmHashRequest(hash=hash),
            x_idempotency_key=idempotency_key,
        )

    async def sign_message(self, address: str, message: str, idempotency_key: str | None = None):
        """Sign an EVM message.

        Args:
            address (str): The address of the account.
            message (str): The message to sign.
            idempotency_key (str, optional): The idempotency key. Defaults to None.

        """
        return await self.api_clients.evm_accounts.sign_evm_message(
            address=address,
            sign_evm_message_request=SignEvmMessageRequest(message=message),
            x_idempotency_key=idempotency_key,
        )

    async def sign_transaction(
        self, address: str, transaction: str, idempotency_key: str | None = None
    ):
        """Sign an EVM transaction.

        Args:
            address (str): The address of the account.
            transaction (str): The transaction to sign.
            idempotency_key (str, optional): The idempotency key. Defaults to None.

        """
        return await self.api_clients.evm_accounts.sign_evm_transaction(
            address=address,
            sign_evm_transaction_request=SignEvmTransactionRequest(transaction=transaction),
            x_idempotency_key=idempotency_key,
        )

    async def send_transaction(self, transaction: str, network: str):
        """Send an EVM transaction. Currently unimplemented."""
        raise NotImplementedError("Sending transactions is not yet implemented")

    async def create_smart_account(self, owner: BaseAccount):
        """Create an EVM smart account.

        Args:
            owner (BaseAccount): The owner of the smart account.

        """
        evm_smart_account = await self.api_clients.evm_smart_accounts.create_evm_smart_account(
            CreateEvmSmartAccountRequest(owners=[owner.address]),
        )
        return EvmSmartAccount(evm_smart_account.address, owner, evm_smart_account.name)

    async def get_smart_account(self, address: str, owner: BaseAccount | None = None):
        """Get an EVM smart account by address.

        Args:
            address (str): The address of the smart account.
            owner (BaseAccount, optional): The owner of the smart account. Defaults to None.

        """
        evm_smart_account = await self.api_clients.evm_smart_accounts.get_evm_smart_account(address)
        return EvmSmartAccount(evm_smart_account.address, owner, evm_smart_account.name)

    async def list_smart_accounts(
        self,
        page_size: int | None = None,
        page_token: str | None = None,
    ):
        """List all EVM smart accounts.

        Args:
            page_size (int, optional): The number of accounts to return per page. Defaults to None.
            page_token (str, optional): The token for the next page of accounts, if any. Defaults to None.

        Returns:
            List[EvmSmartAccount]: List of EVM smart accounts. These are not wrapped in the EvmSmartAccount class
            so these cannot be used to send user operations. Call get_evm_smart_account with an owner to get an EvmSmartAccount
            instance that can be used to send user operations.

        """
        response = await self.api_clients.evm_smart_accounts.list_evm_smart_accounts(
            page_size=page_size, page_token=page_token
        )
        return {
            "evm_smart_accounts": response.accounts,
            "next_page_token": response.next_page_token,
        }

    async def prepare_user_operation(
        self,
        smart_account: EvmSmartAccount,
        calls: list[EncodedCall],
        network: str,
        paymaster_url: str | None = None,
    ) -> EvmUserOperation:
        """Prepare a user operation for a smart account.

        Args:
            smart_account (EvmSmartAccount): The smart account to prepare the user operation for.
            calls (list[EncodedCall]): The calls to prepare the user operation for.
            network (str): The network.
            paymaster_url (str, optional): The paymaster URL. Defaults to None.

        Returns:
            EvmUserOperation: The user operation object.

        """
        evm_calls = [
            EvmCall(
                to=call.to,
                data=call.data if call.data else "0x",
                value=str(call.value) if call.value else "0",
            )
            for call in calls
        ]

        return await self.api_clients.evm_smart_accounts.prepare_user_operation(
            smart_account.address,
            PrepareUserOperationRequest(
                calls=evm_calls,
                network=network,
                paymaster_url=paymaster_url,
            ),
        )

    async def send_user_operation(
        self,
        smart_account: EvmSmartAccount,
        calls: list[ContractCall],
        network: str,
        paymaster_url: str | None = None,
    ) -> EvmUserOperation:
        """Send a user operation for a smart account.

        Args:
            smart_account (EvmSmartAccount): The smart account to send the user operation from.
            calls (List[ContractCall]): The calls to send.
            network (str): The network.
            paymaster_url (str): The paymaster URL.

        Returns:
            UserOperation: The user operation object.

        """
        return await send_user_operation(
            self.api_clients,
            smart_account,
            calls,
            network,
            paymaster_url,
        )

    async def sign_user_operation(self, user_op: EvmUserOperation):
        """Sign a user operation. Currently unimplemented."""
        raise NotImplementedError("Signing user operations is not yet implemented")

    async def wait_for_user_operation(
        self,
        smart_account_address: str,
        user_op_hash: str,
        timeout_seconds: float = 20,
        interval_seconds: float = 0.2,
    ):
        """Wait for a user operation to be processed.

        Args:
            smart_account_address (str): The address of the smart account that sent the operation.
            user_op_hash (str): The hash of the user operation to wait for.
            timeout_seconds (float, optional): Maximum time to wait in seconds. Defaults to 20.
            interval_seconds (float, optional): Time between checks in seconds. Defaults to 0.2.

        """
        return await wait_for_user_operation(
            self.api_clients,
            smart_account_address,
            user_op_hash,
            timeout_seconds,
            interval_seconds,
        )

    async def get_user_operation(self, address: str, user_op_hash: str):
        """Get a user operation by address and hash.

        Args:
            address (str): The address of the smart account that sent the operation.
            user_op_hash (str): The hash of the user operation to get.

        """
        return await self.api_clients.evm_smart_accounts.get_user_operation(address, user_op_hash)

    async def request_faucet(
        self,
        address: str,
        network: str,
        token: str,
    ) -> str:
        """Request a token from the faucet in the test network.

        Args:
            address (str): The address to request the faucet for.
            network (str): The network to request the faucet for.
            token (str): The token to request the faucet for.

        Returns:
            str: The transaction hash of the faucet request.

        """
        response = await self.api_clients.faucets.request_evm_faucet(
            request_evm_faucet_request=RequestEvmFaucetRequest(
                address=address, network=network, token=token
            )
        )
        return response.transaction_hash

    async def list_token_balances(self, address: str, network: str):
        """List the token balances for an address. Currently unimplemented."""
        raise NotImplementedError("Listing token balances is not yet implemented")
