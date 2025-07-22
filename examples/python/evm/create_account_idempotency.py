# Usage: uv run python evm/create_account_idempotency.py

import asyncio
import uuid

from cdp import CdpClient
from dotenv import load_dotenv

load_dotenv()


async def main():
    async with CdpClient() as cdp:
        key = str(uuid.uuid4())
        account = await cdp.evm.create_account(idempotency_key=key)
        account2 = await cdp.evm.create_account(idempotency_key=key)
        account3 = await cdp.evm.create_account(idempotency_key=key)

        print(account.address)
        print(account2.address)
        print(account3.address)


asyncio.run(main())
