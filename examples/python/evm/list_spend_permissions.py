# Usage: uv run python evm/list_spend_permissions.py

import asyncio
import sys
import time

from cdp import CdpClient
from cdp.spend_permissions import SpendPermissionInput
from cdp.utils import parse_units

from dotenv import load_dotenv

load_dotenv()


async def main():
    """Main function to demonstrate listing spend permissions."""

    async with CdpClient() as cdp:
        account = await cdp.evm.get_or_create_smart_account(
            name="Example-Account",
            owner=await cdp.evm.get_or_create_account(
                name="Example-Account-Owner",
            ),
            __experimental_enable_spend_permission__=True,
        )

        spender = await cdp.evm.get_or_create_smart_account(
            name="Example-Spender",
            owner=await cdp.evm.get_or_create_account(
                name="Example-Spender-Owner",
            ),
        )

        print(f"Account address: {account.address}")
        print(f"Spender address: {spender.address}")

        # Optionally create a spend permission if --with-create flag is provided
        if "--with-create" in sys.argv:
            spend_permission = SpendPermissionInput(
                account=account.address,
                spender=spender.address,
                token="usdc",
                allowance=parse_units("0.01", 6),
                period=60 * 60,  # 1 hour
                start=0,
                end=int(time.time()) + 24 * 60 * 60,  # in one day
            )

            user_operation = await cdp.evm.create_spend_permission(
                spend_permission=spend_permission,
                network="base-sepolia",
            )
            print("Spend permission created")

            await cdp.evm.wait_for_user_operation(
                smart_account_address=account.address,
                user_op_hash=user_operation.user_op_hash,
            )

        # List the spend permissions
        permissions = await cdp.evm.list_spend_permissions(account.address)

        print(f"Spend permissions: {permissions}")


if __name__ == "__main__":
    asyncio.run(main())
