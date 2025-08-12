# Usage: uv run python evm/transactions/scoped_account.send_transaction.py

import asyncio
import os
from cdp import CdpClient
from cdp.evm_transaction_types import TransactionRequestEIP1559
from dotenv import load_dotenv
from web3 import Web3

load_dotenv()

async def main():
    async with CdpClient() as cdp:
        # Get or create an account
        account = await cdp.evm.get_or_create_account(name="Playground-Account")
        print(f"Account: {account.address}")

        # Create a network-scoped account using custom RPC
        base_account = await account.__experimental_use_network__(
            network="base-sepolia"
        )
        print(f"Network-scoped account created with custom RPC")

        # Request faucet funds
        print("Requesting faucet...")
        faucet_transaction_hash = await base_account.request_faucet(token="eth")
        print(f"Faucet transaction hash: {faucet_transaction_hash}")

        # Wait for faucet transaction to be confirmed
        print("Waiting for faucet transaction confirmation...")
        faucet_receipt = await base_account.wait_for_transaction_receipt(
            transaction_hash=faucet_transaction_hash
        )
        print(f"Faucet transaction receipt: {faucet_receipt}")

        # Send a transaction using the custom RPC
        print("Sending transaction...")
        transaction_hash = await base_account.send_transaction(
            transaction=TransactionRequestEIP1559(
                to="0x4252e0c9A3da5A2700e7d91cb50aEf522D0C6Fe8",
                value=Web3.to_wei(0.000001, "ether"),
            )
        )
        print(f"Transaction hash: {transaction_hash}")

        # Wait for transaction confirmation
        print("Waiting for transaction confirmation...")
        receipt = await base_account.wait_for_transaction_receipt(
            transaction_hash=transaction_hash
        )
        print(f"Transaction receipt: {receipt}")


if __name__ == "__main__":
    asyncio.run(main())