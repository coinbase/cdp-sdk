# Usage: uv run python evm/account.send_transaction.py

import asyncio
from cdp import CdpClient
from cdp.evm_transaction_types import TransactionRequestEIP1559
from web3 import Web3
from dotenv import load_dotenv

load_dotenv()


async def main():
    async with CdpClient() as cdp:
        account = await cdp.evm.get_or_create_account(name="Account1")
        print(f"Account: {account.address}")

        print("Requesting ETH from faucet for account...")
        faucet_hash = await cdp.evm.request_faucet(
            address=account.address, network="base-sepolia", token="eth"
        )

        w3 = Web3(Web3.HTTPProvider("https://sepolia.base.org"))
        w3.eth.wait_for_transaction_receipt(faucet_hash)
        print("Received funds from faucet...")

        test_network = "base-sepolia"

        # Send a EIP-1559 transaction
        print(f"Sending EIP-1559 transaction for account {account.address} ...")

        tx_hash = await account.send_transaction(
            network=test_network,
            transaction=TransactionRequestEIP1559(
                to="0x0000000000000000000000000000000000000000",
                value=w3.to_wei(0.000001, "ether"),
            ),
        )

        print(f"EIP-1559 transaction sent! Hash: {tx_hash}")
        print("Waiting for EIP-1559 transaction confirmation...")
        tx_receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
        print(f"EIP-1559 transaction send confirmed in block {tx_receipt.blockNumber}")
        print(
            f"EIP-1559 transaction send status: {'Success' if tx_receipt.status == 1 else 'Failed'}"
        )


asyncio.run(main())
