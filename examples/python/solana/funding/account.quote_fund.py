# Usage: uv run python solana/funding/account.quote_fund.py

import asyncio
from cdp import CdpClient
from dotenv import load_dotenv

load_dotenv()


async def main():
    async with CdpClient() as cdp:
        account = await cdp.solana.get_or_create_account(name="account")

        quote = await account.quote_fund(
            token="sol",
            amount=10000000,  # 0.01 sol
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
