from web3 import Web3

from cdp.actions.evm.send_user_operation import send_user_operation
from cdp.actions.evm.transfer.constants import ERC20_ABI
from cdp.actions.evm.transfer.types import (
    TokenType,
    TransferExecutionStrategy,
)
from cdp.actions.evm.transfer.utils import get_erc20_address
from cdp.api_clients import ApiClients
from cdp.evm_call_types import EncodedCall
from cdp.evm_smart_account import EvmSmartAccount
from cdp.openapi_client.models.evm_user_operation import EvmUserOperation as EvmUserOperationModel


class SmartAccountTransferStrategy(TransferExecutionStrategy):
    """Transfer execution strategy for EvmSmartAccount."""

    async def execute_transfer(
        self,
        api_clients: ApiClients,
        from_account: EvmSmartAccount,
        to: str,
        value: int,
        token: TokenType,
        network: str,
        paymaster_url: str | None,
    ) -> EvmUserOperationModel:
        """Execute a transfer from a smart account.

        Args:
            api_clients: The API clients
            from_account: The account to transfer from
            to: The recipient address
            value: The amount to transfer
            token: The token to transfer
            network: The network to transfer on
            paymaster_url: The paymaster URL

        Returns:
            The transaction hash

        """
        if token == "eth":
            # For ETH transfers, we send directly to the recipient
            return await send_user_operation(
                api_clients=api_clients,
                address=from_account.address,
                owner=from_account.owners[0],
                calls=[EncodedCall(to=to, value=str(value), data="0x")],
                network=network,
                paymaster_url=paymaster_url,
            )
        else:
            # For token transfers, we need to interact with the ERC20 contract
            erc20_address = get_erc20_address(token, network)

            # Encode function calls using Web3
            w3 = Web3()
            contract = w3.eth.contract(abi=ERC20_ABI)

            # Create approve call
            approve_data = contract.encode_abi("approve", args=[to, value])

            # Create transfer call
            transfer_data = contract.encode_abi("transfer", args=[to, value])

            # Send user operation with both calls
            return await send_user_operation(
                api_clients=api_clients,
                address=from_account.address,
                owner=from_account.owners[0],
                calls=[
                    EncodedCall(to=erc20_address, data=approve_data),
                    EncodedCall(to=erc20_address, data=transfer_data),
                ],
                network=network,
                paymaster_url=paymaster_url,
            )


# Create the instance for use by the transfer function
smart_account_transfer_strategy = SmartAccountTransferStrategy()
