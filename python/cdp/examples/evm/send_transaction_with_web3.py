# Usage: uv run python cdp/examples/evm/send_transaction.py

import asyncio

from dotenv import load_dotenv
from web3 import Web3

from cdp import CdpClient


async def main():
    """Contains main function for the EVM transaction script."""
    load_dotenv()

    async with CdpClient() as cdp:
        evm_account = await cdp.evm.create_account()
        print(f"Created EVM account: {evm_account.address}")

        faucet_hash = await cdp.evm.request_faucet(
            address=evm_account.address, network="base-sepolia", token="eth"
        )

        w3 = Web3(Web3.HTTPProvider("https://sepolia.base.org"))
        w3.eth.wait_for_transaction_receipt(faucet_hash)
        print(f"Received funds from faucet for address: {evm_account.address}")

        zero_address = "0x0000000000000000000000000000000000000000"

        amount_to_send = w3.to_wei(0.000001, "ether")

        nonce = w3.eth.get_transaction_count(evm_account.address)

        gas_estimate = w3.eth.estimate_gas(
            {"to": zero_address, "from": evm_account.address, "value": amount_to_send}
        )

        # Get max fee and priority fee
        max_priority_fee = w3.eth.max_priority_fee
        max_fee = w3.eth.gas_price + max_priority_fee

        signed_tx = await evm_account.sign_transaction(
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
        print(f"Transaction confirmed in block {tx_receipt.blockNumber}")
        print(f"Transaction status: {'Success' if tx_receipt.status == 1 else 'Failed'}")


asyncio.run(main())
