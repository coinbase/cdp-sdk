# Usage: uv run python evm/eip7702/create_eip7702_delegation.py
#
# Creates an EIP-7702 delegation for an EOA account (upgrading it with smart account
# capabilities on Base Sepolia), then waits for the transaction to be confirmed using web3.

import asyncio

from web3 import Web3

from cdp import CdpClient
from cdp.openapi_client.models.evm_eip7702_delegation_network import (
    EvmEip7702DelegationNetwork,
)
from dotenv import load_dotenv

load_dotenv()

# Base Sepolia RPC for waiting on transaction receipt
w3 = Web3(Web3.HTTPProvider("https://sepolia.base.org"))


async def main():
     async with CdpClient() as cdp:
        # Step 1: Get or create an EOA account
        account = await cdp.evm.get_or_create_account(name="EIP7702-Example-Account-Python")
        print(f"Account address: {account.address}")

        # Step 2: Ensure the account has ETH for gas (request faucet if needed)
        balance = w3.eth.get_balance(account.address)
        if balance == 0:
            print("Requesting ETH from faucet...")
            faucet_hash = await cdp.evm.request_faucet(
                address=account.address,
                network="base-sepolia",
                token="eth",
            )
            w3.eth.wait_for_transaction_receipt(faucet_hash)
            print("Faucet transaction confirmed.")

        # Step 3: Create the EIP-7702 delegation
        print("Creating EIP-7702 delegation...")
        result = await cdp.evm.create_evm_eip7702_delegation(
            address=account.address,
            network="base-sepolia",
            enable_spend_permissions=False,
        )

        print(f"Delegation transaction submitted: {result.transaction_hash}")

        # Step 4: Wait for the transaction to be confirmed onchain
        print("Waiting for transaction confirmation...")
        receipt = w3.eth.wait_for_transaction_receipt(result.transaction_hash)

        print(
            f"Delegation confirmed in block {receipt.blockNumber}. "
            f"Explorer: https://sepolia.basescan.org/tx/{result.transaction_hash}"
        )


if __name__ == "__main__":
    asyncio.run(main())
