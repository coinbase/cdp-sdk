# Usage: uv run python solana/export_account.py

import asyncio
import base58
from cdp import CdpClient
from dotenv import load_dotenv

load_dotenv()


async def main():
    async with CdpClient() as cdp:
        # Get or create account
        account = await cdp.solana.get_or_create_account(
            name="MyAccount",
        )
        print("Account: ", account.address)

        # Exporting account by address
        print("--------------------------------")
        print("Exporting account by address...")
        exported_private_key_by_address = await cdp.solana.export_account(
            address=account.address
        )
        print("Exported private key: ", exported_private_key_by_address)

        # Verify public key (last 32 bytes are the public key)
        full_key_bytes_by_address = base58.b58decode(exported_private_key_by_address)
        public_key_bytes_by_address = full_key_bytes_by_address[32:]
        public_key_by_address = base58.b58encode(public_key_bytes_by_address).decode('utf-8')
        print("Public key derived from private key:", public_key_by_address)

        # Exporting account by name
        print("--------------------------------")
        print("Exporting account by name...")
        exported_private_key_by_name = await cdp.solana.export_account(
            name="MyAccount"
        )
        print("Exported private key: ", exported_private_key_by_name)

        # Verify public key (last 32 bytes are the public key)
        full_key_bytes_by_name = base58.b58decode(exported_private_key_by_name)
        public_key_bytes_by_name = full_key_bytes_by_name[32:]
        public_key_by_name = base58.b58encode(public_key_bytes_by_name).decode('utf-8')
        print("Public key derived from private key:", public_key_by_name)


asyncio.run(main())
