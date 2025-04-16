# Usage: python python/cdp/examples/solana/get_account.py

from dotenv import load_dotenv

from cdp import CdpClient


async def main():
    load_dotenv()

    cdp = CdpClient()

    new_account = await cdp.solana.create_account(name="Account1")
    account = await cdp.solana.get_account(address=new_account.address)
    print("Solana Account Address: ", account.address)
    account = await cdp.solana.get_account(name=new_account.name)
    print("Solana Account Name: ", account.name)

    await cdp.close()


if __name__ == "__main__":
    import asyncio

    asyncio.run(main())
