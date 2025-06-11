# Usage: uv run python evm/get_or_create_account.py

import asyncio

from cdp import CdpClient
from dotenv import load_dotenv

load_dotenv()


async def main():
    async with CdpClient() as cdp:
        # First create an owner account
        owner = await cdp.evm.create_account()
        print("Created owner account:", owner.address)

        # Get or create a smart account with the owner
        # Note: Each owner can only have one smart account
        account = await cdp.evm.get_or_create_smart_account(name="MyAccount", owner=owner)
        print("EVM Smart Account Address:", account.address)

        # Subsequent calls to get_or_create_smart_account with the same owner will return the existing account
        same_account = await cdp.evm.get_or_create_smart_account(name="MyAccount", owner=owner)
        print("Retrieved same account:", same_account.address)
        print("Are accounts equal?", account.address == same_account.address)  # Will be true

        # To create multiple smart accounts, you need different owners
        another_owner = await cdp.evm.create_account()
        print("\nCreated another owner account:", another_owner.address)

        different_account = await cdp.evm.get_or_create_smart_account(
            name="DifferentAccount", owner=another_owner
        )
        print("Different EVM Smart Account Address:", different_account.address)


asyncio.run(main())
