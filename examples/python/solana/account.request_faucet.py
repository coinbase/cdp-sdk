import asyncio
from cdp import CdpClient
from dotenv import load_dotenv

load_dotenv()


async def main():
    async with CdpClient() as cdp:
        account = await cdp.solana.create_account()
        response = await account.request_faucet(token="sol")
        print(response)


asyncio.run(main())
