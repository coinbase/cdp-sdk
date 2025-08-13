# Usage: uv run python evm/scoped_account.send_transaction_custom.py
# Note: Must set CUSTOM_RPC_URL in .env

import asyncio
import os
from cdp import CdpClient
from cdp.evm_transaction_types import TransactionRequestEIP1559
from dotenv import load_dotenv
from web3 import Web3

load_dotenv()

async def main():
    async with CdpClient() as cdp:
        account = await cdp.evm.get_or_create_account(name="Playground-Account")
        print(f"Account: {account.address}")
        # Create a network-scoped account using custom RPC
        polygon_account = await account.__experimental_use_network__(
            network="https://polygon-rpc.com"
        )
        
        # Test send_transaction with TransactionRequestEIP1559
        print("Sending transaction...")
        transaction_hash = await polygon_account.send_transaction(
            transaction=TransactionRequestEIP1559(
                to="0x4252e0c9A3da5A2700e7d91cb50aEf522D0C6Fe8",
                value=Web3.to_wei(0.000001, "ether"),
            )
        )
        print(f"Transaction hash: {transaction_hash}")

        print("Waiting for transaction confirmation...")
        receipt = await polygon_account.wait_for_transaction_receipt(
            transaction_hash=transaction_hash
        )
        print(f"Transaction receipt: {receipt}")

if __name__ == "__main__":
    asyncio.run(main())