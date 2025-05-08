# Usage: uv run python evm/send_transaction.py

import asyncio

from web3 import Web3

from cdp import CdpClient
from dotenv import load_dotenv

load_dotenv()


async def main():
    async with CdpClient() as cdp:
        account = await cdp.evm.create_account()
        print(f"Created account: {account.address}")

        print("Requesting funds from faucet")
        faucet_hash = await cdp.evm.request_faucet(
            address=account.address, network="base-sepolia", token="eth"
        )
        print(f"Faucet transaction hash: {faucet_hash}")

        w3 = Web3(Web3.HTTPProvider("https://sepolia.base.org"))

        print("Waiting for faucet transaction to be confirmed")
        w3.eth.wait_for_transaction_receipt(faucet_hash)
        print(f"Received funds from faucet for address: {account.address}")

        zero_address = "0x0000000000000000000000000000000000000000"

        amount_to_send = w3.to_wei(0.000001, "ether")

        nonce = w3.eth.get_transaction_count(account.address)

        gas_estimate = w3.eth.estimate_gas(
            {"to": zero_address, "from": account.address, "value": amount_to_send}
        )

        # Get max fee and priority fee
        max_priority_fee = w3.eth.max_priority_fee
        max_fee = w3.eth.gas_price + max_priority_fee

        signed_tx = await account.sign_transaction(
            transaction_dict={
                "to": zero_address,
                "value": amount_to_send,
                "chainId": 84532,
                "gas": gas_estimate,
                "maxFeePerGas": max_fee,  # Use maxFeePerGas instead of gasPrice
                "maxPriorityFeePerGas": max_priority_fee,
                "nonce": nonce,
                "type": "0x2",  # EIP-1559 transaction type
            }
        )

        tx_hash = w3.eth.send_raw_transaction(signed_tx.raw_transaction)
        print(f"Transaction sent! Hash: {tx_hash.hex()}")

        print("Waiting for transaction confirmation...")
        tx_receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
        print(
            f"Transaction status: {'Success' if tx_receipt.status == 1 else 'Failed'}"
        )


asyncio.run(main())
