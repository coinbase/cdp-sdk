# Usage: uv run python evm/export_account.py

import asyncio

from cdp import CdpClient
from dotenv import load_dotenv
from eth_account import Account

load_dotenv()


async def main():
    async with CdpClient() as cdp:
        account = Account.create()
        private_key = account.key.hex()
        public_key = account.address
        print("Private key: ", private_key)
        print("Public key: ", public_key)

        imported_account = await cdp.evm.import_account(
            private_key=private_key,
            name="MyImportedAccount",
        )
        print("Imported account: ", imported_account.address)

        # Exporting account by address
        print("--------------------------------")
        print("Exporting account by address...")
        exported_private_key_by_address = await cdp.evm.export_account(
            address=imported_account.address
        )
        print("Exported private key: ", exported_private_key_by_address)
        public_key_by_address = Account.from_key(
            private_key=exported_private_key_by_address
        ).address
        print("Public key derived from private key:", public_key_by_address)

        # Exporting account by name
        print("--------------------------------")
        print("Exporting account by name...")
        exported_private_key_by_name = await cdp.evm.export_account(
            name="MyImportedAccount"
        )
        print("Exported private key: ", exported_private_key_by_name)
        public_key_by_name = Account.from_key(
            private_key=exported_private_key_by_name
        ).address
        print("Public key derived from private key:", public_key_by_name)


asyncio.run(main())
