from typing import cast

from eth_account.typed_transactions import DynamicFeeTransaction
from eth_typing import HexStr
from web3 import Web3

from cdp.actions.evm.transfer.constants import ERC20_ABI
from cdp.actions.evm.transfer.types import (
    TokenType,
    TransferExecutionStrategy,
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
        to: str,
        value: int,
        token: TokenType,
        network: str,
    ) -> HexStr:
        """Execute a transfer from a server account.

        Args:
            api_clients: The API clients
            from_account: The account to transfer from
            to: The recipient address
            value: The amount to transfer
            token: The token to transfer
            network: The network to transfer on

        Returns:
            The transaction hash

        """
        if token == "eth":
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
                    network=network,
                ),
            )

            return cast(HexStr, response.transaction_hash)
        else:
            erc20_address = get_erc20_address(token, network)

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
                    network=network,
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
                    network=network,
                ),
            )

            return cast(HexStr, response.transaction_hash)


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
