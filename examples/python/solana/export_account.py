# Usage: uv run python solana/export_account.py

import asyncio
from solders.keypair import Keypair

from cdp import CdpClient
from dotenv import load_dotenv

load_dotenv()


async def main():
    async with CdpClient() as cdp:
        account = await cdp.solana.create_account(
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

        # Derive keypair and verify public key
        keypair_by_address = Keypair.from_seed(bytes.fromhex(exported_private_key_by_address))
        public_key_by_address = str(keypair_by_address.pubkey())
        print("Public key derived from private key:", public_key_by_address)

        # Exporting account by name
        print("--------------------------------")
        print("Exporting account by name...")
        exported_private_key_by_name = await cdp.solana.export_account(
            name="MyAccount"
        )
        print("Exported private key: ", exported_private_key_by_name)

        # Derive keypair and verify public key
        keypair_by_name = Keypair.from_seed(bytes.fromhex(exported_private_key_by_name))
        public_key_by_name = str(keypair_by_name.pubkey())
        print("Public key derived from private key:", public_key_by_name)


asyncio.run(main())
