# Usage: uv run python evm/base_node_rpc_usage.py
"""
Example demonstrating Base Node RPC URL functionality.

This example shows how the CDP SDK automatically uses the Base Node RPC URL for:
1. Transaction waits when using EvmServerAccount with base/base-sepolia networks
2. Paymaster URL when using EvmSmartAccount with base/base-sepolia networks

The Base Node RPC URL is automatically fetched and used when you call use_network()
with "base" or "base-sepolia" - no additional configuration needed!
"""

import asyncio

from cdp import CdpClient
from cdp.evm_call_types import EncodedCall
from eth_account import Account
from web3 import Web3
import dotenv

dotenv.load_dotenv()


async def main():
    """Demonstrate Base Node RPC URL usage with both server and smart accounts."""
    w3 = Web3(Web3.HTTPProvider("https://sepolia.base.org"))
    
    async with CdpClient() as cdp:
        # Server Account Example - Base Node RPC URL for transaction waits
        account = await cdp.evm.get_or_create_account(name="BaseNodeExample")
        base_account = await account.__experimental_use_network__("base-sepolia")
        
        # Request faucet funds
        faucet_result = await base_account.request_faucet(token="eth")
        
        # This wait uses Base Node RPC URL automatically for faster confirmation
        receipt = await base_account.wait_for_transaction_receipt(
            faucet_result,
            timeout_seconds=60
        )
        print(f"Server account faucet completed: {faucet_result}")
        
        # Smart Account Example - Base Node RPC URL as paymaster
        # Create a proper owner for the smart account
        smart_account_owner = Account.create()
        smart_account = await cdp.evm.get_or_create_smart_account(
            name="BaseNodePaymasterExample", 
            owner=smart_account_owner
        )
        base_smart_account = await smart_account.__experimental_use_network__("base-sepolia")
        
        # Request faucet funds for smart account
        faucet_hash = await base_smart_account.request_faucet(token="eth")
        
        # Wait for smart account faucet transaction to complete
        w3.eth.wait_for_transaction_receipt(faucet_hash)
        print(f"Smart account faucet completed: {faucet_hash}")

if __name__ == "__main__":
    asyncio.run(main()) 