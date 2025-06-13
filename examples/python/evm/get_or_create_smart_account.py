# Usage: uv run python evm/get_or_create_smart_account.py

import asyncio

from cdp import CdpClient
from dotenv import load_dotenv

load_dotenv()


async def main():
    async with CdpClient() as cdp:
        # Create an owner account
        owner = await cdp.evm.create_account()
        print("Created owner account:", owner.address)

        # Create a smart account with the owner
        name = "MySmartAccount"
        account = await cdp.evm.get_or_create_smart_account(name=name, owner=owner)
        print("Smart Account Address: ", account.address)

        # Try to get the same smart account again - should return the existing one
        account2 = await cdp.evm.get_or_create_smart_account(name=name, owner=owner)
        print("Second Smart Account Address: ", account2.address)
        print("Are accounts equal? ", account.address == account2.address)

asyncio.run(main())
