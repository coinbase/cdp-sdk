# Usage: uv run python evm/smart_account.fund.py

import asyncio
from cdp import CdpClient
from dotenv import load_dotenv

load_dotenv()


async def main():
    async with CdpClient() as cdp:
        account = await cdp.evm.get_or_create_account(name="account")
        smart_account = await cdp.evm.create_smart_account(owner=account)

        fund_operation = await smart_account.fund(
            network="base",
            token="usdc",
            amount=1000000,  # 1 USDC
        )

        completed_transfer = await smart_account.wait_for_fund_operation_receipt(
            transfer_id=fund_operation.id,
        )

        print(completed_transfer)


asyncio.run(main()) 