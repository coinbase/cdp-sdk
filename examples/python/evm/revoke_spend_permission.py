# Usage: uv run python evm/account.use_spend_permission.py

import asyncio

from web3 import Web3

from cdp import CdpClient
from cdp.spend_permissions import SpendPermission

from dotenv import load_dotenv

load_dotenv()

web3 = Web3(Web3.HTTPProvider("https://sepolia.base.org"))


async def main():
    """Main function to demonstrate using a spend permission with a smart account."""
    async with CdpClient() as cdp:
        # Create accounts for the example
        master_owner = await cdp.evm.get_or_create_account(
            name="Demo-SpendPermissions-Master-Owner"
        )
        master = await cdp.evm.get_or_create_smart_account(
            name="Demo-SpendPermissions-Master",
            owner=master_owner,
            __experimental_enable_spend_permission__=True,
        )

        spender = await cdp.evm.get_or_create_account(
            name="Demo-SpendPermissions-EOA-Spender"
        )

        faucet_tx_hash = await spender.request_faucet(
            network="base-sepolia", token="eth"
        )
        print(f"Faucet transaction sent: {faucet_tx_hash}")
        tx_receipt = web3.eth.wait_for_transaction_receipt(faucet_tx_hash)
        print(f"Faucet transaction completed: {tx_receipt.transactionHash}")

        print(f"Master account: {master.address}")
        print(f"Spender account: {spender.address}")

        # Create a spend permission
        spend_permission = SpendPermission(
            account=master.address,
            spender=spender.address,
            token="0x036CbD53842c5426634e7929541eC2318f3dCF7e",  # USDC on base-sepolia
            allowance=10000,  # 0.01 USDC (USDC has 6 decimals)
            period=86400,  # 1 day in seconds
            start=0,  # Start immediately
            end=281474976710655,  # Max uint48 (effectively no end)
            salt=0,
            extra_data="0x",
        )

        # Create the spend permission on-chain
        user_operation = await cdp.evm.create_spend_permission(
            spend_permission=spend_permission,
            network="base-sepolia",
        )
        print(
            f"Created spend permission with user operation hash: {user_operation.user_op_hash}"
        )

        # Wait for the user operation to complete
        result = await cdp.evm.wait_for_user_operation(
            smart_account_address=master.address,
            user_op_hash=user_operation.user_op_hash,
        )
        print(f"User operation completed with status: {result.status}")

        # Sleep 2 seconds
        await asyncio.sleep(2)

        # Revoke the spend permission
        revoke_user_operation = await cdp.evm.revoke_spend_permission(
            account=master.address,
            permission_hash="0x79d4c5708f46d7dbe51131e661997bd5de6d43e60b7163bc91e7ddfe57039b87",
            network="base-sepolia",
        )
        print(f"Revoke user operation completed with status: {revoke_user_operation.status}")

        # Wait for the revoke user operation to complete
        revoke_result = await cdp.evm.wait_for_user_operation(
            smart_account_address=master.address,
            user_op_hash=revoke_user_operation.user_op_hash,
        )
        print(f"Revoke user operation completed with status: {revoke_result.status}")


if __name__ == "__main__":
    asyncio.run(main())
