from eth_account.typed_transactions import DynamicFeeTransaction

from cdp.evm_transaction_types import TransactionRequestEIP1559
from cdp.openapi_client.api.evm_accounts_api import EVMAccountsApi
from cdp.openapi_client.models.send_evm_transaction_request import SendEvmTransactionRequest
from cdp.utils import serialize_unsigned_transaction


async def send_transaction(
    evm_accounts: EVMAccountsApi,
    address: str,
    transaction: str | TransactionRequestEIP1559 | DynamicFeeTransaction,
    network: str,
    idempotency_key: str | None = None,
) -> str:
    """Send an EVM transaction.

    Args:
        evm_accounts (EVMAccountsApi): The EVM accounts API.
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
    if isinstance(transaction, str):
        return (
            await evm_accounts.send_evm_transaction(
                address=address,
                send_evm_transaction_request=SendEvmTransactionRequest(
                    transaction=transaction, network=network
                ),
                x_idempotency_key=idempotency_key,
            )
        ).transaction_hash
    elif isinstance(transaction, TransactionRequestEIP1559):
        typed_tx = DynamicFeeTransaction.from_dict(transaction.as_dict())
        serialized_tx = serialize_unsigned_transaction(typed_tx)

        send_evm_transaction_request = SendEvmTransactionRequest(
            transaction=serialized_tx, network=network
        )

        return (
            await evm_accounts.send_evm_transaction(
                address=address,
                send_evm_transaction_request=send_evm_transaction_request,
                x_idempotency_key=idempotency_key,
            )
        ).transaction_hash
    else:
        serialized_tx = serialize_unsigned_transaction(transaction)
        send_evm_transaction_request = SendEvmTransactionRequest(
            transaction=serialized_tx, network=network
        )

        return (
            await evm_accounts.send_evm_transaction(
                address=address,
                send_evm_transaction_request=send_evm_transaction_request,
                x_idempotency_key=idempotency_key,
            )
        ).transaction_hash
