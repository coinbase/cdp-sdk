# Usage: uv run python cdp/examples/evm/create_account_idempotency.py

import asyncio
import uuid

from dotenv import load_dotenv

from cdp import CdpClient


async def main():
    """Contains main function for the EVM account idempotency script."""
    load_dotenv()

    async with CdpClient() as cdp:
        key = str(uuid.uuid4())
        evm_account = await cdp.evm.create_account(idempotency_key=key)
        evm_account2 = await cdp.evm.create_account(idempotency_key=key)
        evm_account3 = await cdp.evm.create_account(idempotency_key=key)

        print(evm_account.address)
        print(evm_account2.address)
        print(evm_account3.address)


# Run the async function
asyncio.run(main())
