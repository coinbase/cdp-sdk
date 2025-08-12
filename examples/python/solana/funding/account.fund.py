# Usage: uv run python solana/funding/account.fund.py

import asyncio
from cdp import CdpClient
from dotenv import load_dotenv

load_dotenv()


async def main():
    async with CdpClient() as cdp:
        account = await cdp.solana.get_or_create_account(name="account")

        fund_operation = await account.fund(
            token="sol",
            amount=10000000, # 0.01 sol
        )

        completed_transfer = await account.wait_for_fund_operation_receipt(
            transfer_id=fund_operation.id,
        )

        print(completed_transfer)


asyncio.run(main())
