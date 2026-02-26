# Usage: uv run python evm/eip7702/create_eip7702_delegation.py
#
# Creates an EIP-7702 delegation for an EOA account (upgrading it with smart account
# capabilities), waits for delegation status to be CURRENT, then sends a user operation
# using to_evm_delegated_account(account).

import asyncio

from web3 import Web3

from cdp import CdpClient, to_evm_delegated_account
from cdp.evm_call_types import EncodedCall
from dotenv import load_dotenv

load_dotenv()

# Base Sepolia RPC for waiting on faucet transaction receipt
w3 = Web3(Web3.HTTPProvider("https://sepolia.base.org"))


async def main():
     async with CdpClient() as cdp:
        # Step 1: Get or create an EOA account
        account = await cdp.evm.get_or_create_account(name="EIP7702-Example-Account-Python")
        print(f"Account address: {account.address}")

        # Step 2: Ensure the account has ETH for gas (request faucet if needed)
        balance = w3.eth.get_balance(account.address)
        if balance == 0:
            print("Requesting ETH from faucet...")
            faucet_hash = await cdp.evm.request_faucet(
                address=account.address,
                network="base-sepolia",
                token="eth",
            )
            w3.eth.wait_for_transaction_receipt(faucet_hash)
            print("Faucet transaction confirmed.")

        # Step 3: Create the EIP-7702 delegation
        await asyncio.sleep(1)
        print("Creating EIP-7702 delegation...")
        tx_hash = await cdp.evm.create_evm_eip7702_delegation(
            address=account.address,
            network="base-sepolia",
            enable_spend_permissions=False,
        )

        print(f"Delegation transaction submitted: {tx_hash}")

        # Step 4: Wait for the delegation status to be CURRENT
        print("Waiting for delegation to be active...")
        delegation_status = await cdp.evm.wait_for_evm_eip7702_delegation_status(
            address=account.address,
            network="base-sepolia",
        )

        print(
            f"Delegation is active (status: {delegation_status.status}). "
            f"Explorer: https://sepolia.basescan.org/tx/{tx_hash}"
        )

        # Step 5: Send a user operation using the upgraded EOA (via to_evm_delegated_account)
        print("Sending user operation with upgraded EOA...")
        delegated = to_evm_delegated_account(account)
        user_op = await delegated.send_user_operation(
            calls=[
                EncodedCall(
                    to="0x0000000000000000000000000000000000000000",
                    value=0,
                    data="0x",
                )
            ],
            network="base-sepolia",
        )

        print(f"User operation submitted: {user_op.user_op_hash}")
        print(f"Check status: https://base-sepolia.blockscout.com/op/{user_op.user_op_hash}")


if __name__ == "__main__":
    asyncio.run(main())
