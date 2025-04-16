# Usage: python python/cdp/examples/evm/get_account.py

from dotenv import load_dotenv

from cdp import CdpClient


async def main():
    load_dotenv()

    cdp = CdpClient()

    new_account = await cdp.evm.create_account(name="Account1")
    account = await cdp.evm.get_account(address=new_account.address)
    print("EVM Account Address: ", account.address)
    account = await cdp.evm.get_account(name=new_account.name)
    print("EVM Account Name: ", account.name)

    await cdp.close()


if __name__ == "__main__":
    import asyncio

    asyncio.run(main())
