from eth_account.signers.base import BaseAccount
from web3 import Web3

from cdp.api_clients import ApiClients
from cdp.evm_call_types import ContractCall, FunctionCall
from cdp.openapi_client.models.evm_call import EvmCall
from cdp.openapi_client.models.evm_user_operation import EvmUserOperation
from cdp.openapi_client.models.prepare_user_operation_request import (
    PrepareUserOperationRequest,
)
from cdp.openapi_client.models.send_user_operation_request import (
    SendUserOperationRequest,
)
from cdp.utils import ensure_awaitable


async def send_user_operation(
    api_clients: ApiClients,
    address: str,
    owner: BaseAccount,
    calls: list[ContractCall],
    network: str,
    paymaster_url: str | None = None,
) -> EvmUserOperation:
    """Send a user operation.

    Args:
        api_clients: The API clients object.
        address (str): The address of the smart account.
        owner (Account): The owner of the smart account.
        calls (List[EVMCall]): The calls to send.
        network (str): The network.
        paymaster_url (str): The paymaster URL.

    Returns:
        UserOperation: The user operation object.

    """
    if not calls:
        raise ValueError("Calls list cannot be empty")

    encoded_calls = []
    for call in calls:
        if isinstance(call, FunctionCall):
            contract = Web3().eth.contract(address=call.to, abi=call.abi)
            data = contract.encode_abi(call.function_name, args=call.args)
            value = "0" if call.value is None else str(call.value)
            encoded_calls.append(EvmCall(to=str(call.to), data=data, value=value))
        else:
            value = "0" if call.value is None else str(call.value)
            data = "0x" if call.data is None else call.data
            encoded_calls.append(EvmCall(to=str(call.to), data=data, value=value))

    prepare_user_operation_request = PrepareUserOperationRequest(
        network=network,
        calls=encoded_calls,
        paymaster_url=paymaster_url,
    )
    user_operation_model = await api_clients.evm_smart_accounts.prepare_user_operation(
        address, prepare_user_operation_request
    )

    signed_payload = await ensure_awaitable(
        owner.unsafe_sign_hash, user_operation_model.user_op_hash
    )
    signature = "0x" + signed_payload.signature.hex()

    send_user_operation_request = SendUserOperationRequest(
        signature=signature,
    )
    user_operation_model = await api_clients.evm_smart_accounts.send_user_operation(
        address,
        user_operation_model.user_op_hash,
        send_user_operation_request,
    )

    return user_operation_model
