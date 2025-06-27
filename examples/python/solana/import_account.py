import asyncio
import base58
from cdp import CdpClient
from dotenv import load_dotenv
from solders.keypair import Keypair


async def main():
    async with CdpClient(
        api_key_id="557730ea-e613-4072-a111-7cd26bcd75a7",
        api_key_secret="/b0ignBsNZ6UQshvmQXyG0SejTZ8+WCzQfaRzkSVi9NociYj2a/Ctr9bG7SpDL7nLN3yPHIRb9tW3qJmCd08ig==",
        wallet_secret="MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQgJeO0FLp3FJRFvPUflelGZL7m94gd7jTrua6pMTD/pq+hRANCAATtJxSQNIZUn6c95KK1dsqLWwhKuuv8PT/kHm6HUnli7AQC8V7dTaVYpQWCMY+mcHrjE0zkn1JBdMAOdkM3+Y2C",
        base_path="https://cloud-api-dev.cbhq.net/platform",
        debugging=True,
    ) as cdp:
        keypair = Keypair()

        account = await cdp.solana.import_account(
            private_key=base58.b58encode(keypair.to_bytes()).decode('utf-8'),
        )
        print("Account: ", account.address)

asyncio.run(main())