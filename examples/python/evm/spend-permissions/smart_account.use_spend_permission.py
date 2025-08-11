# Usage: uv run python evm/spend-permissions/smart_account.use_spend_permission.py

import asyncio
import sys

from cdp import CdpClient
from cdp.spend_permissions import SpendPermissionInput
from cdp.utils import parse_units

from dotenv import load_dotenv

load_dotenv()


async def main():
    """Main function to demonstrate using a spend permission with a smart account."""
    async with CdpClient() as cdp:
        # Create accounts for the example
        account = await cdp.evm.get_or_create_smart_account(
            name="Demo-SpendPermissions-Account",
            owner=await cdp.evm.get_or_create_account(
                name="Demo-SpendPermissions-Account-Owner"
            ),
            enable_spend_permissions=True,
        )

        spender = await cdp.evm.get_or_create_smart_account(
            name="Demo-SpendPermissions-Spender",
            owner=await cdp.evm.get_or_create_account(
                name="Demo-SpendPermissions-Spender-Owner",
            ),
        )

        print(f"Account: {account.address}")
        print(f"Spender account: {spender.address}")

        # Fund the grantor with USDC if --faucet flag is provided
        if "--faucet" in sys.argv:
            await account.request_faucet(
                network="base-sepolia",
                token="usdc",
            )

        spend_permission = SpendPermissionInput(
            account=account.address,
            spender=spender.address,
            token="usdc",  # USDC on base-sepolia
            allowance=parse_units("0.01", 6),  # 0.01 USDC
            period_in_days=1,  # 1 day (much clearer than 86400 seconds!)
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
            smart_account_address=account.address,
            user_op_hash=user_operation.user_op_hash,
        )
        print(f"User operation completed with status: {result.status}")

        # Sleep 2 seconds
        await asyncio.sleep(2)

        all_permissions = await cdp.evm.list_spend_permissions(account.address)
        permissions = [
            permission
            for permission in all_permissions.spend_permissions
            if permission.permission.spender == spender.address.lower()
        ]

        print("Executing spend...")

        # Use the spend permission
        spend_result = await spender.use_spend_permission(
            spend_permission=permissions[-1].permission,  # Use the latest permission
            value=parse_units("0.005", 6),  # Spend 0.005 USDC
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
