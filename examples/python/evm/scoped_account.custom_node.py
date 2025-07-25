# uv run python evm/scoped_account.custom_node.py

import os
import asyncio
from dotenv import load_dotenv

from cdp import CdpClient, NetworkScopedEvmServerAccount
from cdp.evm_transaction_types import TransactionRequestEIP1559

# Load environment variables
load_dotenv()

async def main():
    # Check if NODE_RPC_URL is set, default to "base-sepolia" if not provided
    node_rpc_url = os.getenv("NODE_RPC_URL")
    if not node_rpc_url:
        node_rpc_url = "base-sepolia"
        print("NODE_RPC_URL is not set, using default: base-sepolia")

    # Initialize CDP client with context manager for proper cleanup
    async with CdpClient() as cdp:
        # Get or create an account
        account = await cdp.evm.get_or_create_account(
            name="Playground-Account"
        )

        # Create a network-scoped account using the custom RPC URL
        # The network parameter will be treated as an RPC URL since it starts with "http"
        base_account = NetworkScopedEvmServerAccount(
            evm_server_account=account,
            network=node_rpc_url  # This will be treated as a custom RPC URL
        )

        print(f"Using network: {node_rpc_url}")
        print(f"Account address: {base_account.address}")

        # Request faucet (if supported on the network)
        try:
            faucet_result = await base_account.request_faucet(
                token="eth"
            )
            print(f"Faucet transaction hash: {faucet_result}")

            # Wait for faucet transaction receipt
            faucet_receipt = await base_account.wait_for_transaction_receipt(
                faucet_result,
                timeout_seconds=60
            )
            print(f"Faucet transaction receipt: {faucet_receipt}")
        except Exception as e:
            print(f"Faucet not available or failed: {e}")

        # Send a transaction
        try:
            # Convert 0.000001 ETH to wei (18 decimals)
            amount_wei = 1000000000000  # 0.000001 ETH in wei
            
            # Create a proper TransactionRequestEIP1559 object
            transaction = TransactionRequestEIP1559(
                to="0x4252e0c9A3da5A2700e7d91cb50aEf522D0C6Fe8",
                value=amount_wei,
                gas=21000,  # Standard ETH transfer gas limit
            )
            
            transaction_hash = await base_account.send_transaction(
                transaction=transaction
            )
            print(f"Transaction hash: {transaction_hash}")

            # Wait for transaction receipt
            receipt = await base_account.wait_for_transaction_receipt(
                transaction_hash,
                timeout_seconds=60
            )
            print(f"Transaction receipt: {receipt}")
            
        except Exception as e:
            print(f"Transaction failed: {e}")

if __name__ == "__main__":
    asyncio.run(main()) 