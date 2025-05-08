# Usage: uv run python evm/smart_account.send_user_operation.py

import asyncio
from cdp import CdpClient
from cdp.evm_call_types import EncodedCall
from eth_account import Account
from dotenv import load_dotenv

load_dotenv()


async def main():
    async with CdpClient() as cdp:
        smart_account = await cdp.evm.create_smart_account(owner=Account.create())

        user_operation = await smart_account.send_user_operation(
            network="base-sepolia",
            calls=[
                EncodedCall(
                    to="0x0000000000000000000000000000000000000000",
                    data="0x",
                    value=0,
                )
            ],
        )

        user_op_result = await cdp.evm.wait_for_user_operation(
            smart_account_address=smart_account.address,
            user_op_hash=user_operation.user_op_hash,
        )
        print("User Operation Result:", user_op_result)


asyncio.run(main())
