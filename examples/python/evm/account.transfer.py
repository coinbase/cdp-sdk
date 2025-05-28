# Usage: uv run python evm/account.transfer.py

import asyncio
from cdp import CdpClient
from web3 import Web3
from dotenv import load_dotenv

load_dotenv()


async def main():
    async with CdpClient() as cdp:
        sender = await cdp.evm.get_or_create_account(name="Sender")
        receiver = await cdp.evm.get_or_create_account(name="Receiver")

        print("Requesting USDC and ETH from faucet...")

        [usdcFaucetHash, ethFaucetHash] = await asyncio.gather(
            cdp.evm.request_faucet(
                address=sender.address, network="base-sepolia", token="usdc"
            ),
            cdp.evm.request_faucet(
                address=sender.address, network="base-sepolia", token="eth"
            ),
        )

        w3 = Web3(Web3.HTTPProvider("https://sepolia.base.org"))

        w3.eth.wait_for_transaction_receipt(usdcFaucetHash)
        w3.eth.wait_for_transaction_receipt(ethFaucetHash)

        print(
            f"Received USDC from faucet. Explorer link: https://sepolia.basescan.org/tx/{usdcFaucetHash}"
        )
        print(
            f"Received ETH from faucet. Explorer link: https://sepolia.basescan.org/tx/{ethFaucetHash}"
        )

        print(f"Sending 0.01 USDC from {sender.address} to {receiver.address}...")
        tx_hash = await sender.transfer(
            to=receiver,
            amount=10000,  # equivalent to 0.01 USDC
            token="usdc",
            network="base-sepolia",
        )

        receipt = w3.eth.wait_for_transaction_receipt(tx_hash)

        print(f"Transfer status: {receipt.status}")
        print(f"Explorer link: https://sepolia.basescan.org/tx/{tx_hash}")


asyncio.run(main())
