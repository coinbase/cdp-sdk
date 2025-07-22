# Usage: uv run python evm/account.quote_fund.py

import asyncio
from cdp import CdpClient
from dotenv import load_dotenv

load_dotenv()


async def main():
    async with CdpClient() as cdp:
        account = await cdp.evm.get_or_create_account(name="account")

        quote = await account.quote_fund(
            network="base",
            token="eth",
            amount=500000000000000,  # 0.0005 eth
        )

        # get details of the quote
        print("Fiat amount: ", quote.fiat_amount)
        print("Fiat currency: ", quote.fiat_currency)
        print("Token amount: ", quote.token_amount)
        print("Token: ", quote.token)
        print("Network: ", quote.network)
        for fee in quote.fees:
            print("Fee type: ", fee.type)  # operation or network
            print("Fee amount: ", fee.amount)  # amount in the token
            print("Fee currency: ", fee.currency)  # currency of the amount


asyncio.run(main()) 