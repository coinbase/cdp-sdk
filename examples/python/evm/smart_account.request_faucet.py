# Usage: uv run python evm/smart_account.request_faucet.py

import asyncio
from cdp import CdpClient
from web3 import Web3
from eth_account import Account
from dotenv import load_dotenv

load_dotenv()


async def main():
    async with CdpClient() as cdp:
        smart_account = await cdp.evm.create_smart_account(owner=Account.create())
        print(f"Smart Account: {smart_account.address}")

        print("Requesting ETH from faucet for smart account...")
        faucet_hash = await smart_account.request_faucet(
            network="base-sepolia",
            token="eth",
        )

        w3 = Web3(Web3.HTTPProvider("https://sepolia.base.org"))
        w3.eth.wait_for_transaction_receipt(faucet_hash)
        print("Received funds from faucet!")


asyncio.run(main())
