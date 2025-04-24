# Usage: uv run python evm/send_transaction.py

import asyncio

from web3 import Web3

from cdp import CdpClient

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

        zero_address = "0x0000000000000000000000000000000000000000"

        amount_to_send = w3.to_wei(0.000001, "ether")

        nonce = w3.eth.get_transaction_count(account.address)

        gas_estimate = w3.eth.estimate_gas(
            {"to": zero_address, "from": account.address, "value": amount_to_send}
        )

        # Get max fee and priority fee
        max_priority_fee = w3.eth.max_priority_fee
        max_fee = w3.eth.gas_price + max_priority_fee

        tx_hash = await cdp.evm.send_transaction(
            address=account.address,
            transaction={
                "to": zero_address,
                "value": amount_to_send,
                "chainId": 84532,
                "gas": gas_estimate,
                "maxFeePerGas": max_fee,
                "maxPriorityFeePerGas": max_priority_fee,
                "nonce": nonce,
                "type": "0x2",
            },
            network="base-sepolia",
        )

        print(f"Transaction sent! Hash: {tx_hash}")

        print("Waiting for transaction confirmation...")
        tx_receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
        print(f"Transaction confirmed in block {tx_receipt.blockNumber}")
        print(f"Transaction status: {'Success' if tx_receipt.status == 1 else 'Failed'}")


asyncio.run(main())
