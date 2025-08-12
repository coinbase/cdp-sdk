# Usage: uv run python evm/smart-accounts/smart_account.quote_fund.py

import asyncio
from cdp import CdpClient
from dotenv import load_dotenv

load_dotenv()


async def main():
    async with CdpClient() as cdp:
        account = await cdp.evm.create_account()
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


asyncio.run(main()) 