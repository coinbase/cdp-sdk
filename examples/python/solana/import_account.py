import asyncio
import base58
from cdp import CdpClient
from dotenv import load_dotenv
from solders.keypair import Keypair


async def main():
    async with CdpClient() as cdp:
        keypair = Keypair()

        account = await cdp.solana.import_account(
            private_key=base58.b58encode(keypair.to_bytes()).decode('utf-8'),
        )
        print("Account: ", account.address)

asyncio.run(main())