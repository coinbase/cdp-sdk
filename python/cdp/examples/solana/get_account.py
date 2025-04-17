# Usage: python python/cdp/examples/solana/get_account.py

from dotenv import load_dotenv

from cdp import CdpClient


async def main():
    load_dotenv()

    async with CdpClient() as cdp:
        new_account = await cdp.solana.create_account()
        account = await cdp.solana.get_account(address=new_account.address)
        print("Solana Account Address: ", account.address)
        account = await cdp.solana.get_account(name=new_account.name)
        print("Solana Account Name: ", account.name)


if __name__ == "__main__":
    import asyncio

    asyncio.run(main())
