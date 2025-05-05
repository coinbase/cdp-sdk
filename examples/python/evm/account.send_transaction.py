# Usage: uv run python evm/account.send_transaction.py

import asyncio
from cdp import CdpClient
from cdp.evm_transaction_types import TransactionRequestEIP1559
from eth_account.typed_transactions import DynamicFeeTransaction
from web3 import Web3


async def main():
    async with CdpClient() as cdp:
        account = await cdp.evm.get_or_create_account(name="Account1")
        print(f"Account: {account.address}")

        print(f"Requesting ETH from faucet for account...")
        faucet_hash = await cdp.evm.request_faucet(
            address=account.address, network="base-sepolia", token="eth"
        )

        w3 = Web3(Web3.HTTPProvider("https://sepolia.base.org"))
        w3.eth.wait_for_transaction_receipt(faucet_hash)
        print(f"Received funds from faucet...")

        test_network = "base-sepolia"

        # Sending a serialized transaction
        print("--------------------------------")
        print(f"Sending serialized transaction for account {account.address} ...")

        tx_hash = await account.send_transaction(
            network=test_network,
            transaction="0x02e5808080808094123456789012345678901234567890123456789085e8d4a5100080c0808080",
        )

        print(f"Serialized transaction sent! Hash: {tx_hash}")
        print("Waiting for serialized transaction confirmation...")
        tx_receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
        print(f"Serialized transaction send confirmed in block {tx_receipt.blockNumber}")
        print(f"Serialized transaction send status: {'Success' if tx_receipt.status == 1 else 'Failed'}")


        # Sending an EIP-1559 transaction
        print("--------------------------------")
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
        print(f"EIP-1559 transaction send status: {'Success' if tx_receipt.status == 1 else 'Failed'}")

        # Sending a dynamic fee transaction
        print("--------------------------------")
        print("Sending a dynamic fee transaction...")

        nonce = w3.eth.get_transaction_count(account.address)
        tx_hash = await account.send_transaction(
            network=test_network,
            transaction=DynamicFeeTransaction.from_dict(
                {
                    "to": "0x0000000000000000000000000000000000000000",
                    "value": w3.to_wei(0.000001, "ether"),
                    "gas": 21000,
                    "maxFeePerGas": 1000000000000000000,
                    "maxPriorityFeePerGas": 1000000000000000000,
                    "nonce": nonce,
                    "type": "0x2",
                }
            ),
        )

        print(f"Dynamic fee transaction sent! Hash: {tx_hash}")
        print("Waiting for dynamic fee transaction confirmation...")
        tx_receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
        print(f"Dynamic fee transaction send confirmed in block {tx_receipt.blockNumber}")
        print(f"Dynamic fee transaction send status: {'Success' if tx_receipt.status == 1 else 'Failed'}")


asyncio.run(main())
