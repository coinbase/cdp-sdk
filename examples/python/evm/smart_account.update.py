# Usage: uv run python evm/smart_account.update.py

import asyncio

from cdp import CdpClient
from dotenv import load_dotenv
from cdp.update_smart_account_types import UpdateSmartAccountOptions

load_dotenv()


async def main():
    async with CdpClient() as cdp:
        # Create an owner account
        owner = await cdp.evm.create_account()
        print("Created owner account:", owner.address)

        # Create a smart account with the owner
        name = "MySmartAccount"
        smart_account = await cdp.evm.get_or_create_smart_account(owner=owner, name=name)
        print("Created smart account:", smart_account.address)
        print("Original name:", smart_account.name)

        # Update the smart account with a new name
        updated_name = "MySmartAccount3"
        update_request = UpdateSmartAccountOptions(name=updated_name)
        
        updated_smart_account = await cdp.evm.update_smart_account(
            address=smart_account.address,
            update=update_request,
            owner=owner
        )
        
        print("Updated smart account:", updated_smart_account.address)
        print("New name:", updated_smart_account.name)

        # Verify the update by retrieving the smart account again
        retrieved_smart_account = await cdp.evm.get_smart_account(
            address=smart_account.address,
            owner=owner
        )
        
        print("Retrieved smart account name:", retrieved_smart_account.name)
        print("Update successful:", retrieved_smart_account.name == updated_name)


asyncio.run(main())
