# Usage: uv run python evm/smart_account.transfer.py

import asyncio
from cdp import CdpClient
from eth_account import Account
from cdp.actions.evm.transfer import TransferOptions


async def main():
    async with CdpClient() as cdp:
        private_key = Account.create().key
        owner = Account.from_key(private_key)

        # Create smart account with the generated owner
        sender = await cdp.evm.create_smart_account(owner=owner)

        # Create receiver account
        receiver = await cdp.evm.get_or_create_account(name="Receiver")

        print(f"Transferring 0 USDC from {sender.address} to {receiver.address}...")

        # Execute the transfer
        transfer_result = await sender.transfer(
            TransferOptions(
                to=receiver,
                amount="0",
                token="usdc",
                network="base-sepolia",
            )
        )

        print(f"Transfer status: {transfer_result.status}")
        print(
            f"Explorer link: https://sepolia.basescan.org/tx/{transfer_result.transaction_hash}"
        )


if __name__ == "__main__":
    asyncio.run(main())
