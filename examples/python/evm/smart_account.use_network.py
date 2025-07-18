# Usage: uv run python evm/smart_account.use_network.py

import asyncio
from cdp import CdpClient
from eth_account import Account
from dotenv import load_dotenv
from web3 import Web3

load_dotenv()

async def main():
    async with CdpClient() as cdp:
        # Create an owner account for the smart account
        owner = Account.create()
        print(f"Owner address: {owner.address}")

        # Get or create a smart account with the owner
        smart_account = await cdp.evm.get_or_create_smart_account(owner=owner, name="UseNetworkDemoSmartAccount")
        print(f"Original smart account address: {smart_account.address}")

        # Scope the smart account to a specific network using the use_network method
        network = "base"
        network_smart_account = await smart_account.use_network(network)
        print(f"Created network-scoped smart account for network '{network}'")

        # Now you can use the network-scoped smart account to call network-specific methods
        print(f"Listing token balances for smart account {network_smart_account.address} on network '{network}'...")
        try:
            balances = await network_smart_account.list_token_balances()
            for balance in balances.balances:
                print(f"Token contract address: {balance.token.contract_address}")
                print(f"Token balance: {balance.amount.amount}")
        except Exception as e:
            print(f"Failed to list token balances: {e}")

if __name__ == "__main__":
    asyncio.run(main())
