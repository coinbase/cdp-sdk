# Usage: uv run python evm/account.request_faucet.py

import asyncio
from cdp import CdpClient
from web3 import Web3
from dotenv import load_dotenv

load_dotenv()


async def main():
    async with CdpClient() as cdp:
        account = await cdp.evm.get_or_create_account(name="Account1")
        print(f"Account: {account.address}")

        print("Requesting ETH from faucet for account...")
        faucet_hash = await account.request_faucet(
            network="base-sepolia",
            token="eth",
        )

        w3 = Web3(Web3.HTTPProvider("https://sepolia.base.org"))
        w3.eth.wait_for_transaction_receipt(faucet_hash)
        print("Received funds from faucet!")


asyncio.run(main())
