# Usage: uv run python evm/revoke_spend_permission.py

import asyncio
from web3 import Web3

from cdp import CdpClient
from cdp.spend_permissions import SpendPermission

from dotenv import load_dotenv

load_dotenv()


async def main():
    """Main function to demonstrate creating a spend permission."""

    async with CdpClient() as cdp:
        # Create the owner account
        owner = await cdp.evm.create_account()
        print(f"Created owner account: {owner.address}")

        # Create a smart account with spend permissions enabled
        smart_account = await cdp.evm.create_smart_account(
            owner=owner, __experimental_enable_spend_permission__=True
        )
        print(f"Created smart account: {smart_account.address}")

        # Create a spender account
        spender = await cdp.evm.create_account()
        print(f"Created spender account: {spender.address}")

        # Create a spend permission
        spend_permission = SpendPermission(
            account=smart_account.address,
            spender=spender.address,
            token="0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",  # ETH
            allowance=Web3.to_wei(0.00001, "ether"),  # 0.00001 ETH
            period=86400,  # 1 day
            start=0,
            end=281474976710655,  # Max uint48
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
            smart_account_address=smart_account.address,
            user_op_hash=user_operation.user_op_hash,
        )
        print(f"User operation completed with status: {result.status}")

        # List the spend permissions
        permissions = await cdp.evm.list_spend_permissions(smart_account.address)

        # Sleep 2 seconds
        await asyncio.sleep(2)

        # Revoke the spend permission
        revoke_user_operation = await cdp.evm.revoke_spend_permission(
            address=smart_account.address,
            permission_hash=permissions.spend_permissions[0].permission_hash,
            network="base-sepolia",
        )

        # Wait for the revoke user operation to complete
        revoke_result = await cdp.evm.wait_for_user_operation(
            smart_account_address=smart_account.address,
            user_op_hash=revoke_user_operation.user_op_hash,
        )
        print(f"Revoke user operation completed with status: {revoke_result.status}")

if __name__ == "__main__":
    asyncio.run(main())
