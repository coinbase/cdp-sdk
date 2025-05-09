# Usage: uv run python evm/smart_account.transfer.py

import asyncio
from cdp import CdpClient
from eth_account import Account
from dotenv import load_dotenv
from web3 import Web3

load_dotenv()


async def main():
    async with CdpClient() as cdp:
        private_key = Account.create().key
        owner = Account.from_key(private_key)

        # Create smart account with the generated owner
        sender = await cdp.evm.create_smart_account(owner=owner)

        # Create receiver account
        receiver = await cdp.evm.get_or_create_account(name="Receiver")

        print("Requesting USDC from faucet...")

        faucet_tx_hash = await sender.request_faucet(
            network="base-sepolia", token="usdc"
        )

        w3 = Web3(Web3.HTTPProvider("https://sepolia.base.org"))
        w3.eth.wait_for_transaction_receipt(faucet_tx_hash)

        print(
            f"Received USDC from faucet. Explorer link: https://sepolia.basescan.org/tx/{faucet_tx_hash}"
        )

        print(f"Transferring 0.01 USDC from {sender.address} to {receiver.address}...")

        # Execute the transfer
        transfer_result = await sender.transfer(
            to=receiver,
            amount=10000,  # equivalent to 0.01 USDC
            token="usdc",
            network="base-sepolia",
        )

        user_op_result = await sender.wait_for_user_operation(
            user_op_hash=transfer_result.user_op_hash
        )

        print(f"Transfer status: {user_op_result.status}")
        print(
            f"Explorer link: https://sepolia.basescan.org/tx/{user_op_result.transaction_hash}"
        )


if __name__ == "__main__":
    asyncio.run(main())
