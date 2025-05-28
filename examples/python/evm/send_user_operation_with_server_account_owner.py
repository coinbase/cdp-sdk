# Usage: uv run python evm/send_user_operation_with_server_account_owner.py

import asyncio
from decimal import Decimal

from web3 import Web3

from cdp import CdpClient
from cdp.evm_call_types import EncodedCall
from dotenv import load_dotenv

load_dotenv()


async def main():
    w3 = Web3(Web3.HTTPProvider("https://sepolia.base.org"))

    async with CdpClient() as cdp:
        account = await cdp.evm.create_account()
        print("Created account:", account.address)

        smart_account = await cdp.evm.create_smart_account(account)
        print("Created smart account:", smart_account.address)

        print("Requesting faucet")
        faucet_hash = await cdp.evm.request_faucet(
            address=smart_account.address, network="base-sepolia", token="eth"
        )

        w3.eth.wait_for_transaction_receipt(faucet_hash)
        print(
            "Faucet funds received. Transaction explorer link:",
            f"https://sepolia.basescan.org/tx/{faucet_hash}",
        )

        print("Sending user operation")
        user_operation = await cdp.evm.send_user_operation(
            smart_account=smart_account,
            calls=[
                EncodedCall(
                    to="0x0000000000000000000000000000000000000000",
                    data="0x",
                    value=Web3.to_wei(Decimal("0.0000005"), "ether"),
                )
            ],
            network="base-sepolia",
        )

        user_operation = await cdp.evm.wait_for_user_operation(
            smart_account_address=smart_account.address,
            user_op_hash=user_operation.user_op_hash,
        )
        print(
            "User operation sent. Transaction explorer link:",
            f"https://sepolia.basescan.org/tx/{user_operation.transaction_hash}",
        )


asyncio.run(main())
