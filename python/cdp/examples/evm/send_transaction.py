# Usage: uv run python cdp/examples/evm/send_transaction.py

import asyncio
from dotenv import load_dotenv
from web3 import Web3
from cdp import CdpClient


async def main():
    load_dotenv()

    cdp = CdpClient()

    evm_account = await cdp.evm.create_account()
    print(f"Created EVM account: {evm_account.address}")

    await cdp.evm.request_faucet(
        address=evm_account.address, network="base-sepolia", token="eth"
    )
    print(f"Requested funds from faucet for address: {evm_account.address}")
    await asyncio.sleep(5)  # Wait for faucet transaction to complete

    # Connect to Base Sepolia
    w3 = Web3(Web3.HTTPProvider("https://sepolia.base.org"))

    # Check if connected
    if not w3.is_connected():
        print("Failed to connect to Base Sepolia")
        return

    print(f"Connected to Base Sepolia: {w3.is_connected()}")

    # Zero address
    zero_address = "0x0000000000000000000000000000000000000000"

    # Amount to send (in wei) - 0.000001 ETH
    amount_to_send = w3.to_wei(0.000001, "ether")

    # Get the nonce
    nonce = w3.eth.get_transaction_count(evm_account.address)

    # Estimate gas (optional but recommended)
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

    # Send the transaction
    tx_hash = w3.eth.send_raw_transaction(signed_tx.raw_transaction)
    print(f"Transaction sent! Hash: {tx_hash.hex()}")

    # Wait for transaction receipt
    print("Waiting for transaction confirmation...")
    tx_receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
    print(f"Transaction confirmed in block {tx_receipt.blockNumber}")
    print(f"Transaction status: {'Success' if tx_receipt.status == 1 else 'Failed'}")

    await cdp.close()


asyncio.run(main())
