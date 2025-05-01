from typing import cast

from eth_account.typed_transactions import DynamicFeeTransaction
from eth_typing import HexStr
from web3 import Web3
from web3.exceptions import TimeExhausted

from cdp.actions.evm.transfer.constants import ERC20_ABI
from cdp.actions.evm.transfer.types import (
    TransferExecutionStrategy,
    TransferOptions,
    TransferResult,
)
from cdp.actions.evm.transfer.utils import get_erc20_address
from cdp.api_clients import ApiClients
from cdp.evm_server_account import EvmServerAccount
from cdp.evm_transaction_types import TransactionRequestEIP1559
from cdp.openapi_client.models.send_evm_transaction_request import SendEvmTransactionRequest
from cdp.utils import serialize_unsigned_transaction


class AccountTransferStrategy(TransferExecutionStrategy):
    """Transfer execution strategy for EvmServerAccount."""

    async def execute_transfer(
        self,
        api_clients: ApiClients,
        from_account: EvmServerAccount,
        transfer_args: TransferOptions,
        to: str,
        value: int,
    ) -> HexStr:
        """Execute a transfer from a server account.

        Args:
            api_clients: The API clients
            from_account: The account to transfer from
            transfer_args: The transfer options
            to: The recipient address
            value: The amount to transfer

        Returns:
            The transaction hash

        """
        if transfer_args.token == "eth":
            transaction = TransactionRequestEIP1559(
                to=to,
                value=value,
            )

            typed_tx = DynamicFeeTransaction.from_dict(transaction.as_dict())
            serialized_tx = serialize_unsigned_transaction(typed_tx)

            response = await api_clients.evm_accounts.send_evm_transaction(
                address=from_account.address,
                send_evm_transaction_request=SendEvmTransactionRequest(
                    transaction=serialized_tx,
                    network=transfer_args.network,
                ),
            )

            return cast(HexStr, response.transaction_hash)
        else:
            erc20_address = get_erc20_address(transfer_args.token, transfer_args.network)

            approve_data = _encode_erc20_function_call(erc20_address, "approve", [to, value])

            approve_tx = TransactionRequestEIP1559(
                to=erc20_address,
                data=approve_data,
            )

            typed_tx = DynamicFeeTransaction.from_dict(approve_tx.as_dict())
            serialized_tx = serialize_unsigned_transaction(typed_tx)

            await api_clients.evm_accounts.send_evm_transaction(
                address=from_account.address,
                send_evm_transaction_request=SendEvmTransactionRequest(
                    transaction=serialized_tx,
                    network=transfer_args.network,
                ),
            )

            transfer_data = _encode_erc20_function_call(erc20_address, "transfer", [to, value])

            transfer_tx = TransactionRequestEIP1559(
                to=erc20_address,
                data=transfer_data,
            )

            typed_tx = DynamicFeeTransaction.from_dict(transfer_tx.as_dict())
            serialized_tx = serialize_unsigned_transaction(typed_tx)

            response = await api_clients.evm_accounts.send_evm_transaction(
                address=from_account.address,
                send_evm_transaction_request=SendEvmTransactionRequest(
                    transaction=serialized_tx,
                    network=transfer_args.network,
                ),
            )

            return cast(HexStr, response.transaction_hash)

    async def wait_for_result(
        self, api_clients: ApiClients, from_account: EvmServerAccount, w3: Web3, hash: HexStr
    ) -> TransferResult:
        """Wait for the result of a transfer.

        Args:
            api_clients: The API clients
            from_account: The account to transfer from
            w3: The Web3 client
            hash: The transaction hash

        Returns:
            The result of the transfer

        """
        chain_id = w3.eth.chain_id

        try:
            receipt = w3.eth.wait_for_transaction_receipt(hash)

            if receipt.status == 1:
                return TransferResult(status="success", transaction_hash=hash)
            else:
                raise Exception(
                    f"Transaction failed. Check the transaction on a transaction explorer."
                    f"Chain ID: {chain_id}"
                    f"Transaction hash: {hash}"
                )
        except TimeExhausted:
            raise TimeoutError(
                f"Transaction timed out. Check the transaction on a transaction explorer."
                f"Chain ID: {chain_id}"
                f"Transaction hash: {hash}"
            ) from None


def _encode_erc20_function_call(address: str, function_name: str, args: list) -> str:
    """Encode an ERC20 function call.

    Args:
        address: The address of the contract
        function_name: The function name
        args: The function arguments

    Returns:
        The encoded function call

    """
    w3 = Web3()
    contract = w3.eth.contract(address=address, abi=ERC20_ABI)

    return contract.encode_abi(function_name, args=args)


# Create the instance for use by the transfer function
account_transfer_strategy = AccountTransferStrategy()
