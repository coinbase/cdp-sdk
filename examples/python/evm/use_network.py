# Usage: uv run python evm/use_network.py

import asyncio
from cdp import CdpClient
from dotenv import load_dotenv
from web3 import Web3

load_dotenv()

async def main():
    async with CdpClient() as cdp:
        # Get or create an EVM server account
        account = await cdp.evm.get_or_create_account(name="UseNetworkDemoAccount")
        print(f"Original account address: {account.address}")

        # Scope the account to a specific network using the use_network method
        network = "base"
        network_account = await account.use_network(network)
        print(f"Created network-scoped account for network '{network}'")

        # Now you can use the network-scoped account to call network-specific methods
        print(f"Listing token balances for account {network_account.address} on network '{network}'...")
        try:
            balances = await network_account.list_token_balances()
            print(f"Token balances: {balances}")
        except Exception as e:
            print(f"Failed to list token balances: {e}")

        # You can also use the network-scoped account for other operations, e.g., send_transaction, transfer, etc.
        # See other examples for more advanced usage.

if __name__ == "__main__":
    asyncio.run(main())
