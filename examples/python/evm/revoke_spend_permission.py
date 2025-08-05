# Usage: uv run python evm/revoke_spend_permission.py

import asyncio

from cdp import CdpClient
from cdp.spend_permissions import SpendPermissionInput
from cdp.utils import parse_units

from dotenv import load_dotenv

load_dotenv()


async def main():
    """Main function to demonstrate creating and revoking a spend permission."""

    async with CdpClient() as cdp:
        account = await cdp.evm.get_or_create_smart_account(
            name="Example-Account-Revoke",
            owner=await cdp.evm.get_or_create_account(
                name="Example-Account-Revoke-Owner",
            ),
            __experimental_enable_spend_permission__=True,
        )
        print(f"Account Address: {account.address}")

        # Create a spender account
        spender = await cdp.evm.create_account()
        print(f"Spender Address: {spender.address}")

        # Create a spend permission
        spend_permission = SpendPermissionInput(
            account=account.address,
            spender=spender.address,
            token="usdc",
            allowance=parse_units("0.01", 6),
            period=86400,  # 1 day
            start=0,
            end=281474976710655,  # Max uint48
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

        # List the spend permissions
        permissions = await cdp.evm.list_spend_permissions(account.address)

        # Revoke the spend permission
        revoke_user_operation = await cdp.evm.revoke_spend_permission(
            address=account.address,
            permission_hash=permissions.spend_permissions[0].permission_hash,
            network="base-sepolia",
        )

        # Wait for the revoke user operation to complete
        revoke_result = await cdp.evm.wait_for_user_operation(
            smart_account_address=account.address,
            user_op_hash=revoke_user_operation.user_op_hash,
        )
        print(f"Revoke user operation completed with status: {revoke_result.status}")


if __name__ == "__main__":
    asyncio.run(main())
