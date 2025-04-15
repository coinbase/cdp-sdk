# Usage: uv run python cdp/examples/evm/create_account_idempotency.py

import asyncio
from dotenv import load_dotenv
import os
import uuid

from cdp import CdpClient


async def main():
    load_dotenv()

    cdp = CdpClient(
        api_key_id=os.getenv("CDP_API_KEY_NAME"),
        api_key_secret=os.getenv("CDP_API_KEY_SECRET"),
        wallet_secret=os.getenv("CDP_WALLET_SECRET"),
        base_path=os.getenv("CDP_API_URL"),
    )

    key = str(uuid.uuid4())
    evm_account = await cdp.evm.create_account(idempotency_key=key)
    evm_account2 = await cdp.evm.create_account(idempotency_key=key)
    evm_account3 = await cdp.evm.create_account(idempotency_key=key)

    print(evm_account.address)
    print(evm_account2.address)
    print(evm_account3.address)

    await cdp.close()


# Run the async function
asyncio.run(main())
