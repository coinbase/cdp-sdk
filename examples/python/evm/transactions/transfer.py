# Usage: uv run python evm/transactions/transfer.py

import asyncio
from cdp import CdpClient
from eth_account import Account
from dotenv import load_dotenv
from web3 import Web3

load_dotenv()

async def main():
    async with CdpClient() as cdp:
        account = await cdp.evm.get_or_create_account(name="MyAccount")

        faucet_tx = await account.request_faucet(network="base-sepolia", token="eth")
        
        # Wait for the faucet transaction to be confirmed
        w3 = Web3(Web3.HTTPProvider("https://sepolia.base.org"))
        w3.eth.wait_for_transaction_receipt(faucet_tx)

        print("Faucet transaction receipt:", faucet_tx)
        
        hash = await account.transfer(
            to="0x4252e0c9A3da5A2700e7d91cb50aEf522D0C6Fe8",
            amount=Web3.to_wei("0.000001", "ether"),
            token="eth",
            network="base-sepolia",
        )

        print("Transaction hash:", hash)
        
if __name__ == "__main__":
    asyncio.run(main())