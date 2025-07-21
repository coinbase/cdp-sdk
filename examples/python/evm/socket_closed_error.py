# Usage: uv run python evm/send_transaction.py

import asyncio
from web3 import Web3
from cdp import CdpClient
from cdp.evm_transaction_types import TransactionRequestEIP1559
from dotenv import load_dotenv

load_dotenv()

w3 = Web3(Web3.HTTPProvider("https://sepolia.base.org"))

def create_and_fund_account():
    """Create and fund an account synchronously by running async code"""
    async def _create_and_fund():
        async with CdpClient() as cdp:
            account = await cdp.evm.create_account()
            print(f"Created account: {account.address}")

            faucet_hash = await cdp.evm.request_faucet(
                address=account.address, network="base-sepolia", token="eth"
            )
            
            w3.eth.wait_for_transaction_receipt(faucet_hash)
            print(f"Received funds from faucet for address: {account.address}")
            return account
    
    return asyncio.run(_create_and_fund())

def send_test_transaction(account):
    """Send a test transaction synchronously by running async code with a new CDP client"""
    async def _send_transaction():
        # This works because we create a new CDP client each time
        async with CdpClient() as cdp:
            tx_hash = await cdp.evm.send_transaction(
                address=account.address,
                transaction=TransactionRequestEIP1559(
                    to="0x0000000000000000000000000000000000000000",
                    value=w3.to_wei(0.000001, "ether"),
                ),
                network="base-sepolia",
            )

            print(f"Transaction sent! Hash: {tx_hash}")
            print("Waiting for transaction confirmation...")
            tx_receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
            print(f"Transaction confirmed in block {tx_receipt.blockNumber}")
            print(
                f"Transaction status: {'Success' if tx_receipt.status == 1 else 'Failed'}"
            )
            return tx_hash

    return asyncio.run(_send_transaction())

def send_test_transaction_directly(account):
    """Send a test transaction synchronously by running async code directly on the account.
    This should fail with socket closed error because the account's client connection is closed."""
    async def _send_transaction():
        # This will fail because the account's connection was closed when the original CDP client context ended
        tx_hash = await account.send_transaction(
            transaction=TransactionRequestEIP1559(
                to="0x0000000000000000000000000000000000000000",
                value=w3.to_wei(0.000001, "ether"),
            ),
            network="base-sepolia",
        )

        print(f"Transaction sent! Hash: {tx_hash}")
        print("Waiting for transaction confirmation...")
        tx_receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
        print(f"Transaction confirmed in block {tx_receipt.blockNumber}")
        print(
            f"Transaction status: {'Success' if tx_receipt.status == 1 else 'Failed'}"
        )
        return tx_hash

    return asyncio.run(_send_transaction())

def main():
    # First create and fund the account
    account = create_and_fund_account()
    
    # First approach: Creating new CDP client each time (works)
    try:
        print("\nSending first transaction with new CDP client...")
        send_test_transaction(account)
        
        print("\nSending second transaction with new CDP client...")
        send_test_transaction(account)
    except Exception as e:
        print(f"\nError occurred with new CDP client approach: {str(e)}")

    # Second approach: Using account directly (should fail with socket closed)
    try:
        print("\nTrying to send transaction directly using account...")
        send_test_transaction_directly(account)
    except Exception as e:
        print(f"\nError occurred with direct account usage: {str(e)}")
        print("This error occurs because we're trying to use the account object")
        print("after its original client connection was closed.")

if __name__ == "__main__":
    main()
