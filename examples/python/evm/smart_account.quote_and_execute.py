# Usage: uv run python evm/smart_account.quote_and_execute.py

import asyncio
from cdp import CdpClient
from dotenv import load_dotenv

load_dotenv()


async def main():
    async with CdpClient() as cdp:
        account = await cdp.evm.get_or_create_account(name="account")
        smart_account = await cdp.evm.create_smart_account(owner=account)

        quote = await smart_account.quote_fund(
            network="base",
            token="usdc",
            amount=1000000,  # 1 USDC
        )

        # get details of the quote
        print(quote.fiat_amount)
        print(quote.token_amount)
        print(quote.token)
        print(quote.network)
        for fee in quote.fees:
            print(fee.type)  # operation or network
            print(fee.amount)  # amount in the token
            print(fee.currency)  # currency of the amount

        response = await quote.execute()

        completed_transfer = await smart_account.wait_for_fund_operation_receipt(
            transfer_id=response.id,
        )

        print(completed_transfer)


asyncio.run(main()) 