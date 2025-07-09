import base64
import re
from typing import TYPE_CHECKING, Any, Union

from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.primitives.serialization import load_pem_public_key
from eth_account.signers.base import BaseAccount
from eth_account.typed_transactions import DynamicFeeTransaction

from cdp.actions.evm.list_token_balances import list_token_balances
from cdp.actions.evm.request_faucet import request_faucet
from cdp.actions.evm.send_transaction import send_transaction
from cdp.actions.evm.send_user_operation import send_user_operation
from cdp.actions.evm.swap import (
    create_swap_quote as swap_create_swap_quote,
    get_swap_price as swap_get_swap_price,
)
from cdp.actions.evm.wait_for_user_operation import wait_for_user_operation
from cdp.analytics import wrap_class_with_error_tracking
from cdp.api_clients import ApiClients
from cdp.constants import ImportAccountPublicRSAKey
from cdp.evm_call_types import ContractCall, EncodedCall
from cdp.evm_server_account import EvmServerAccount, ListEvmAccountsResponse
from cdp.evm_smart_account import EvmSmartAccount, ListEvmSmartAccountsResponse
from cdp.evm_token_balances import ListTokenBalancesResult
from cdp.evm_transaction_types import TransactionRequestEIP1559
from cdp.export import decrypt_with_private_key, generate_export_encryption_key_pair
from cdp.openapi_client.errors import ApiError
from cdp.openapi_client.models.create_evm_account_request import CreateEvmAccountRequest
from cdp.openapi_client.models.create_evm_smart_account_request import (
    CreateEvmSmartAccountRequest,
)
from cdp.openapi_client.models.eip712_domain import EIP712Domain
from cdp.openapi_client.models.eip712_message import EIP712Message
from cdp.openapi_client.models.evm_call import EvmCall
from cdp.openapi_client.models.evm_user_operation import EvmUserOperation as EvmUserOperationModel
from cdp.openapi_client.models.export_evm_account_request import ExportEvmAccountRequest
from cdp.openapi_client.models.import_evm_account_request import ImportEvmAccountRequest
from cdp.openapi_client.models.prepare_user_operation_request import (
    PrepareUserOperationRequest,
)
from cdp.openapi_client.models.sign_evm_hash_request import SignEvmHashRequest
from cdp.openapi_client.models.sign_evm_message_request import SignEvmMessageRequest
from cdp.openapi_client.models.sign_evm_transaction_request import (
    SignEvmTransactionRequest,
)
from cdp.openapi_client.models.update_evm_account_request import UpdateEvmAccountRequest
from cdp.openapi_client.models.update_evm_smart_account_request import UpdateEvmSmartAccountRequest
from cdp.update_account_types import UpdateAccountOptions
from cdp.update_smart_account_types import UpdateSmartAccountOptions

if TYPE_CHECKING:
    from cdp.actions.evm.swap.types import QuoteSwapResult, SwapPriceResult, SwapUnavailableResult


class EvmClient:
    """The EvmClient class is responsible for CDP API calls for the EVM."""

    def __init__(self, api_clients: ApiClients):
        self.api_clients = api_clients
        wrap_class_with_error_tracking(EvmServerAccount)
        wrap_class_with_error_tracking(EvmSmartAccount)

    async def create_account(
        self,
        name: str | None = None,
        account_policy: str | None = None,
        idempotency_key: str | None = None,
    ) -> EvmServerAccount:
        """Create an EVM account.

        Args:
            name (str, optional): The name. Defaults to None.
            account_policy (str, optional): The ID of the account-level policy to apply to the account. Defaults to None.
            idempotency_key (str, optional): The idempotency key. Defaults to None.

        Returns:
            EvmServerAccount: The EVM server account.

        """
        evm_account = await self.api_clients.evm_accounts.create_evm_account(
            x_idempotency_key=idempotency_key,
            create_evm_account_request=CreateEvmAccountRequest(
                name=name,
                account_policy=account_policy,
            ),
        )
        return EvmServerAccount(evm_account, self.api_clients.evm_accounts, self.api_clients)

    async def import_account(
        self,
        private_key: str,
        encryption_public_key: str | None = ImportAccountPublicRSAKey,
        name: str | None = None,
        idempotency_key: str | None = None,
    ) -> EvmServerAccount:
        """Import an EVM account.

        Args:
            private_key (str): The private key of the account.
            encryption_public_key (str, optional): The public RSA key used to encrypt the private key when importing an EVM account. Defaults to the known public key.
            name (str, optional): The name. Defaults to None.
            idempotency_key (str, optional): The idempotency key. Defaults to None.

        Returns:
            EvmServerAccount: The EVM server account.

        """
        private_key_hex = private_key[2:] if private_key.startswith("0x") else private_key
        if not re.match(r"^[0-9a-fA-F]+$", private_key_hex):
            raise ValueError("Private key must be a valid hexadecimal string")

        try:
            private_key_bytes = bytes.fromhex(private_key_hex)
            public_key = load_pem_public_key(encryption_public_key.encode())
            encrypted_private_key = public_key.encrypt(
                private_key_bytes,
                padding.OAEP(
                    mgf=padding.MGF1(algorithm=hashes.SHA256()),
                    algorithm=hashes.SHA256(),
                    label=None,
                ),
            )
            encrypted_private_key = base64.b64encode(encrypted_private_key).decode("utf-8")
            evm_account = await self.api_clients.evm_accounts.import_evm_account(
                import_evm_account_request=ImportEvmAccountRequest(
                    encrypted_private_key=encrypted_private_key,
                    name=name,
                ),
                x_idempotency_key=idempotency_key,
            )
            return EvmServerAccount(evm_account, self.api_clients.evm_accounts, self.api_clients)
        except ApiError as e:
            raise e
        except Exception as e:
            raise ValueError(f"Failed to import account: {e}") from e

    async def export_account(
        self,
        address: str | None = None,
        name: str | None = None,
        idempotency_key: str | None = None,
    ) -> str:
        """Export an EVM account.

        Args:
            address (str, optional): The address of the account.
            name (str, optional): The name of the account.
            idempotency_key (str, optional): The idempotency key.

        Returns:
            str: The decrypted private key which is a 32-byte private key hex string without a "0x" prefix.

        Raises:
            ValueError: If neither address nor name is provided.

        """
        public_key, private_key = generate_export_encryption_key_pair()

        if address:
            response = await self.api_clients.evm_accounts.export_evm_account(
                address=address,
                export_evm_account_request=ExportEvmAccountRequest(
                    export_encryption_key=public_key,
                ),
                x_idempotency_key=idempotency_key,
            )
            return decrypt_with_private_key(private_key, response.encrypted_private_key)

        if name:
            response = await self.api_clients.evm_accounts.export_evm_account_by_name(
                name=name,
                export_evm_account_request=ExportEvmAccountRequest(
                    export_encryption_key=public_key,
                ),
                x_idempotency_key=idempotency_key,
            )
            return decrypt_with_private_key(private_key, response.encrypted_private_key)

        raise ValueError("Either address or name must be provided")

    async def create_smart_account(
        self, owner: BaseAccount, name: str | None = None
    ) -> EvmSmartAccount:
        """Create an EVM smart account.

        Args:
            owner (BaseAccount): The owner of the smart account.
            name (str, optional): The name of the smart account.

        Returns:
            EvmSmartAccount: The EVM smart account.

        """
        evm_smart_account = await self.api_clients.evm_smart_accounts.create_evm_smart_account(
            create_evm_smart_account_request=CreateEvmSmartAccountRequest(
                owners=[owner.address], name=name
            ),
        )
        return EvmSmartAccount(
            evm_smart_account.address,
            owner,
            evm_smart_account.name,
            evm_smart_account.policies,
            self.api_clients,
        )

    async def get_or_create_smart_account(self, owner: BaseAccount, name: str) -> EvmSmartAccount:
        """Get an EVM smart account, or create one if it doesn't exist.

        Args:
            owner (BaseAccount): The owner of the smart account.
            name (str): The name of the smart account.

        Returns:
            EvmSmartAccount: The EVM smart account.

        """
        try:
            account = await self.get_smart_account(name=name, owner=owner)
            return account
        except ApiError as e:
            if e.http_code == 404:
                try:
                    account = await self.create_smart_account(name=name, owner=owner)
                    return account
                except ApiError as e:
                    if e.http_code == 409:
                        account = await self.get_smart_account(name=name, owner=owner)
                        return account
                    raise e
            raise e

    async def get_account(
        self, address: str | None = None, name: str | None = None
    ) -> EvmServerAccount:
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
        return EvmServerAccount(evm_account, self.api_clients.evm_accounts, self.api_clients)

    async def get_or_create_account(self, name: str | None = None) -> EvmServerAccount:
        """Get an EVM account, or create one if it doesn't exist.

        Args:
            name (str, optional): The name of the account to get or create.

        Returns:
            EvmServerAccount: The EVM server account.

        """
        try:
            account = await self.get_account(name=name)
            return account
        except ApiError as e:
            if e.http_code == 404:
                try:
                    account = await self.create_account(name=name)
                    return account
                except ApiError as e:
                    if e.http_code == 409:
                        account = await self.get_account(name=name)
                        return account
                    raise e
            raise e

    async def get_smart_account(
        self, address: str | None = None, name: str | None = None, owner: BaseAccount | None = None
    ) -> EvmSmartAccount:
        """Get an EVM smart account by address.

        Args:
            address (str, optional): The address of the smart account.
            name (str, optional): The name of the smart account. Defaults to None.
            owner (BaseAccount, optional): The owner of the smart account. Defaults to None.

        Returns:
            EvmSmartAccount: The EVM smart account.

        """
        if address:
            evm_smart_account = await self.api_clients.evm_smart_accounts.get_evm_smart_account(
                address
            )
        elif name:
            evm_smart_account = (
                await self.api_clients.evm_smart_accounts.get_evm_smart_account_by_name(name)
            )
        else:
            raise ValueError("Either address or name must be provided")
        return EvmSmartAccount(
            evm_smart_account.address,
            owner,
            evm_smart_account.name,
            evm_smart_account.policies,
            self.api_clients,
        )

    async def get_user_operation(self, address: str, user_op_hash: str) -> EvmUserOperationModel:
        """Get a user operation by address and hash.

        Args:
            address (str): The address of the smart account that sent the operation.
            user_op_hash (str): The hash of the user operation to get.

        Returns:
            EvmUserOperationModel: The user operation model.

        """
        return await self.api_clients.evm_smart_accounts.get_user_operation(address, user_op_hash)

    async def list_accounts(
        self,
        page_size: int | None = None,
        page_token: str | None = None,
    ) -> ListEvmAccountsResponse:
        """List all EVM accounts.

        Args:
            page_size (int, optional): The number of accounts to return per page. Defaults to None.
            page_token (str, optional): The token for the next page of accounts, if any. Defaults to None.

        Returns:
            ListEvmAccountsResponse: The list of EVM accounts.

        """
        response = await self.api_clients.evm_accounts.list_evm_accounts(
            page_size=page_size, page_token=page_token
        )
        evm_server_accounts = [
            EvmServerAccount(account, self.api_clients.evm_accounts, self.api_clients)
            for account in response.accounts
        ]
        return ListEvmAccountsResponse(
            accounts=evm_server_accounts,
            next_page_token=response.next_page_token,
        )

    async def list_token_balances(
        self,
        address: str,
        network: str,
        page_size: int | None = None,
        page_token: str | None = None,
    ) -> ListTokenBalancesResult:
        """List the token balances for an address on the given network.

        Args:
            address (str): The address to list the token balances for.
            network (str): The network to list the token balances for.
            page_size (int, optional): The number of token balances to return per page. Defaults to None.
            page_token (str, optional): The token for the next page of token balances, if any. Defaults to None.

        Returns:
            [ListTokenBalancesResult]: The token balances for the address on the network.

        """
        return await list_token_balances(
            self.api_clients.evm_token_balances,
            address,
            network,
            page_size,
            page_token,
        )

    async def list_smart_accounts(
        self,
        page_size: int | None = None,
        page_token: str | None = None,
    ) -> ListEvmSmartAccountsResponse:
        """List all EVM smart accounts.

        Args:
            page_size (int, optional): The number of accounts to return per page. Defaults to None.
            page_token (str, optional): The token for the next page of accounts, if any. Defaults to None.

        Returns:
            ListEvmSmartAccountsResponse: The list of EVM smart accounts. The smart accounts are not wrapped
            in the EvmSmartAccount class so these cannot be used to send user operations. Call get_smart_account
            with an owner to get an EvmSmartAccount instance that can be used to send user operations.

        """
        response = await self.api_clients.evm_smart_accounts.list_evm_smart_accounts(
            page_size=page_size, page_token=page_token
        )
        return ListEvmSmartAccountsResponse(
            accounts=response.accounts,
            next_page_token=response.next_page_token,
        )

    async def prepare_user_operation(
        self,
        smart_account: EvmSmartAccount,
        calls: list[EncodedCall],
        network: str,
        paymaster_url: str | None = None,
    ) -> EvmUserOperationModel:
        """Prepare a user operation for a smart account.

        Args:
            smart_account (EvmSmartAccount): The smart account to prepare the user operation for.
            calls (list[EncodedCall]): The calls to prepare the user operation for.
            network (str): The network.
            paymaster_url (str, optional): The paymaster URL. Defaults to None.

        Returns:
            EvmUserOperationModel: The user operation model.

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
        return await request_faucet(self.api_clients.faucets, address, network, token)

    async def sign_hash(self, address: str, hash: str, idempotency_key: str | None = None) -> str:
        """Sign an EVM hash.

        Args:
            address (str): The address of the account.
            hash (str): The hash to sign.
            idempotency_key (str, optional): The idempotency key. Defaults to None.

        Returns:
            str: The signed hash.

        """
        response = await self.api_clients.evm_accounts.sign_evm_hash(
            address=address,
            sign_evm_hash_request=SignEvmHashRequest(hash=hash),
            x_idempotency_key=idempotency_key,
        )
        return response.signature

    async def sign_message(
        self, address: str, message: str, idempotency_key: str | None = None
    ) -> str:
        """Sign an EVM message.

        Args:
            address (str): The address of the account.
            message (str): The message to sign.
            idempotency_key (str, optional): The idempotency key. Defaults to None.

        Returns:
            str: The signed message.

        """
        response = await self.api_clients.evm_accounts.sign_evm_message(
            address=address,
            sign_evm_message_request=SignEvmMessageRequest(message=message),
            x_idempotency_key=idempotency_key,
        )
        return response.signature

    async def sign_typed_data(
        self,
        address: str,
        domain: EIP712Domain,
        types: dict[str, Any],
        primary_type: str,
        message: dict[str, Any],
        idempotency_key: str | None = None,
    ) -> str:
        """Sign an EVM typed data.

        Args:
            address (str): The address of the account.
            domain (EIP712Domain): The domain of the message.
            types (Dict[str, Any]): The types of the message.
            primary_type (str): The primary type of the message.
            message (Dict[str, Any]): The message to sign.
            idempotency_key (str, optional): The idempotency key. Defaults to None.

        Returns:
            str: The signature.

        """
        eip712_message = EIP712Message(
            domain=domain,
            types=types,
            primary_type=primary_type,
            message=message,
        )
        response = await self.api_clients.evm_accounts.sign_evm_typed_data(
            address=address,
            eip712_message=eip712_message,
            x_idempotency_key=idempotency_key,
        )
        return response.signature

    async def sign_transaction(
        self, address: str, transaction: str, idempotency_key: str | None = None
    ) -> str:
        """Sign an EVM transaction.

        Args:
            address (str): The address of the account.
            transaction (str): The transaction to sign.
            idempotency_key (str, optional): The idempotency key. Defaults to None.

        Returns:
            str: The signed transaction.

        """
        response = await self.api_clients.evm_accounts.sign_evm_transaction(
            address=address,
            sign_evm_transaction_request=SignEvmTransactionRequest(transaction=transaction),
            x_idempotency_key=idempotency_key,
        )
        return response.signed_transaction

    async def send_transaction(
        self,
        address: str,
        transaction: str | TransactionRequestEIP1559 | DynamicFeeTransaction,
        network: str,
        idempotency_key: str | None = None,
    ) -> str:
        """Send an EVM transaction.

        Args:
            address (str): The address of the account.
            transaction (str | TransactionDictType | DynamicFeeTransaction): The transaction to send.

                This can be either an RLP-encoded transaction to sign and send, as a 0x-prefixed hex string, or an EIP-1559 transaction request object.

                Use TransactionRequestEIP1559 if you would like Coinbase to manage the nonce and gas parameters.

                You can also use DynamicFeeTransaction from eth-account, but you will have to set the nonce and gas parameters manually.

                These are the fields that can be contained in the transaction object:

                    - `to`: (Required) The address of the contract or account to send the transaction to.
                    - `value`: (Optional) The amount of ETH, in wei, to send with the transaction.
                    - `data`: (Optional) The data to send with the transaction; only used for contract calls.
                    - `gas`: (Optional) The amount of gas to use for the transaction.
                    - `nonce`: (Optional) The nonce to use for the transaction. If not provided, the API will assign a nonce to the transaction based on the current state of the account.
                    - `maxFeePerGas`: (Optional) The maximum fee per gas to use for the transaction. If not provided, the API will estimate a value based on current network conditions.
                    - `maxPriorityFeePerGas`: (Optional) The maximum priority fee per gas to use for the transaction. If not provided, the API will estimate a value based on current network conditions.
                    - `accessList`: (Optional) The access list to use for the transaction.
                    - `chainId`: (Ignored) The value of the `chainId` field in the transaction is ignored.
                    - `from`: (Ignored) Ignored in favor of the account address that is sending the transaction.
                    - `type`: (Ignored) The transaction type must always be 0x2 (EIP-1559).

            network (str): The network.
            idempotency_key (str, optional): The idempotency key. Defaults to None.

        Returns:
            str: The transaction hash.

        """
        return await send_transaction(
            self.api_clients.evm_accounts,
            address,
            transaction,
            network,
            idempotency_key,
        )

    async def send_user_operation(
        self,
        smart_account: EvmSmartAccount,
        calls: list[ContractCall],
        network: str,
        paymaster_url: str | None = None,
    ) -> EvmUserOperationModel:
        """Send a user operation for a smart account.

        Args:
            smart_account (EvmSmartAccount): The smart account to send the user operation from.
            calls (List[ContractCall]): The calls to send.
            network (str): The network.
            paymaster_url (str): The paymaster URL.

        Returns:
            EvmUserOperationModel: The user operation model.

        """
        return await send_user_operation(
            self.api_clients,
            smart_account.address,
            smart_account.owners[0],
            calls,
            network,
            paymaster_url,
        )

    async def update_account(
        self,
        address: str,
        update: UpdateAccountOptions,
        idempotency_key: str | None = None,
    ) -> EvmServerAccount:
        """Update an EVM account.

        Args:
            address (str): The address of the account.
            update (UpdateAccountOptions): The updates to apply to the account.
            idempotency_key (str, optional): The idempotency key.

        Returns:
            EvmServerAccount: The updated EVM account.

        """
        account = await self.api_clients.evm_accounts.update_evm_account(
            address=address,
            update_evm_account_request=UpdateEvmAccountRequest(
                name=update.name,
                account_policy=update.account_policy,
            ),
            x_idempotency_key=idempotency_key,
        )
        return EvmServerAccount(account, self.api_clients.evm_accounts, self.api_clients)

    async def update_smart_account(
        self,
        address: str,
        update: UpdateSmartAccountOptions,
        owner: BaseAccount,
        idempotency_key: str | None = None,
    ) -> EvmSmartAccount:
        """Update an EVM smart account.

        Args:
            address (str): The address of the smart account.
            update (UpdateSmartAccountOptions): The updates to apply to the smart account.
            owner (BaseAccount): The owner of the smart account.
            idempotency_key (str, optional): The idempotency key.

        Returns:
            EvmSmartAccount: The updated EVM smart account.

        """
        smart_account = await self.api_clients.evm_smart_accounts.update_evm_smart_account(
            address=address,
            update_evm_smart_account_request=UpdateEvmSmartAccountRequest(
                name=update.name,
            ),
        )
        return EvmSmartAccount(smart_account.address, owner, smart_account.name, self.api_clients)

    async def wait_for_user_operation(
        self,
        smart_account_address: str,
        user_op_hash: str,
        timeout_seconds: float = 20,
        interval_seconds: float = 0.2,
    ) -> EvmUserOperationModel:
        """Wait for a user operation to be processed.

        Args:
            smart_account_address (str): The address of the smart account that sent the operation.
            user_op_hash (str): The hash of the user operation to wait for.
            timeout_seconds (float, optional): Maximum time to wait in seconds. Defaults to 20.
            interval_seconds (float, optional): Time between checks in seconds. Defaults to 0.2.

        Returns:
            EvmUserOperationModel: The user operation model.

        """
        return await wait_for_user_operation(
            self.api_clients,
            smart_account_address,
            user_op_hash,
            timeout_seconds,
            interval_seconds,
        )

    async def get_swap_price(
        self,
        from_token: str,
        to_token: str,
        from_amount: str | int,
        network: str,
        taker: str,
        idempotency_key: str | None = None,
    ) -> "SwapPriceResult":
        """Get a swap price for swapping tokens.

        Args:
            from_token (str): The contract address of the token to swap from.
            to_token (str): The contract address of the token to swap to.
            from_amount (str | int): The amount to swap from (in smallest unit or as string).
            network (str): The network to get the price for.
            taker (str): The address that will perform the swap.
            idempotency_key (str, optional): Optional idempotency key for safe retryable requests.

        Returns:
            SwapPriceResult: The swap price with estimated output amount.

        """
        return await swap_get_swap_price(
            self.api_clients,
            from_token,
            to_token,
            from_amount,
            network,
            taker,
            idempotency_key,
        )

    async def create_swap_quote(
        self,
        from_token: str,
        to_token: str,
        from_amount: str | int,
        network: str,
        taker: str,
        slippage_bps: int | None = None,
        signer_address: str | None = None,
        idempotency_key: str | None = None,
    ) -> Union["QuoteSwapResult", "SwapUnavailableResult"]:
        """Create a swap quote with transaction data.

        This method follows the OpenAPI spec field names.

        Args:
            from_token (str): The contract address of the token to swap from.
            to_token (str): The contract address of the token to swap to.
            from_amount (str | int): The amount to swap from (in smallest unit).
            network (str): The network to create the swap on.
            taker (str): The address that will execute the swap.
            slippage_bps (int, optional): The maximum slippage in basis points (100 = 1%).
            signer_address (str, optional): The address that will sign the transaction (for smart accounts).
            idempotency_key (str, optional): Optional idempotency key for safe retryable requests.

        Returns:
            Union[QuoteSwapResult, SwapUnavailableResult]: The swap quote with transaction data or SwapUnavailableResult if liquidity is insufficient.

        Examples:
            **Using individual parameters**:
            ```python
            quote = await cdp.evm.create_swap_quote(
                from_token="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",  # USDC
                to_token="0x4200000000000000000000000000000000000006",  # WETH
                from_amount="100000000",  # 100 USDC
                network="base",
                taker=account.address,
                slippage_bps=100,  # 1%
                idempotency_key="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            )
            ```

            **With signer address for smart accounts**:
            ```python
            quote = await cdp.evm.create_swap_quote(
                from_token="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",  # USDC
                to_token="0x4200000000000000000000000000000000000006",  # WETH
                from_amount="100000000",
                network="base",
                taker=smart_account.address,
                signer_address=owner.address,  # Owner signs for smart account
                idempotency_key="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            )
            ```

        """
        return await swap_create_swap_quote(
            self.api_clients,
            from_token,
            to_token,
            from_amount,
            network,
            taker,
            slippage_bps,
            signer_address,
            idempotency_key,
        )
