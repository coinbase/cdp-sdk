# Usage: uv run python evm/import_account.py

import asyncio

from cdp import CdpClient
from dotenv import load_dotenv
from eth_account import Account

load_dotenv()


async def main():
    async with CdpClient() as cdp:
        account = Account.create()
        account = await cdp.evm.import_account(
            private_key=account.key.hex(),
            name="MyImportedAccount",
        )
        print("Imported account: ", account.address)


asyncio.run(main())
