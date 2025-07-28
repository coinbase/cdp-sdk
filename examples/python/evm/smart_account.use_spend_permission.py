# Usage: uv run python evm/smart_account.use_spend_permission.py

import asyncio

from cdp import CdpClient
from cdp.spend_permissions import SpendPermission

from dotenv import load_dotenv

load_dotenv()


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

        spender_owner = await cdp.evm.get_or_create_account(
            name="Demo-SpendPermissions-Spender-Owner"
        )
        spender = await cdp.evm.get_or_create_smart_account(
            name="Demo-SpendPermissions-Spender",
            owner=spender_owner,
        )

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

        print("Executing spend...")

        # Use the spend permission
        spend_result = await spender.__experimental_use_spend_permission__(
            spend_permission=spend_permission,
            value=10000,  # 0.01 USDC
            network="base-sepolia",
        )

        print(f"Spend sent, waiting for receipt... {spend_result.user_op_hash}")

        # Wait for spend to complete
        spend_user_op = await spender.wait_for_user_operation(
            user_op_hash=spend_result.user_op_hash,
        )

        print("Spend completed!")
        print(
            f"Transaction: https://sepolia.basescan.org/tx/{spend_user_op.transaction_hash}"
        )


if __name__ == "__main__":
    asyncio.run(main())
