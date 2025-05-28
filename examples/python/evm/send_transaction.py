# Usage: uv run python evm/send_transaction.py

import asyncio

from web3 import Web3

from cdp import CdpClient
from cdp.evm_transaction_types import TransactionRequestEIP1559
from dotenv import load_dotenv

load_dotenv()

w3 = Web3(Web3.HTTPProvider("https://sepolia.base.org"))


async def main():
    async with CdpClient() as cdp:
        account = await cdp.evm.create_account()
        print(f"Created account: {account.address}")

        faucet_hash = await cdp.evm.request_faucet(
            address=account.address, network="base-sepolia", token="eth"
        )

        w3.eth.wait_for_transaction_receipt(faucet_hash)
        print(f"Received funds from faucet for address: {account.address}")

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


asyncio.run(main())
