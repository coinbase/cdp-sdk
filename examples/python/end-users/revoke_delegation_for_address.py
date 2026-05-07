"""Example: Revoke the active account-scoped delegation for an end user address.

Usage: python revoke_delegation_for_address.py <USER_UUID> <ADDRESS>
"""

import asyncio
import sys

from cdp import CdpClient


async def main(user_id: str, address: str) -> None:
    """Revoke an account-scoped delegation via client method and account shorthand."""
    async with CdpClient() as cdp:
        # Via the client method
        await cdp.end_user.revoke_delegation_for_end_user_account(
            user_id=user_id,
            address=address,
        )
        print("Revoked delegation via client method")

        # Via the EndUserAccount shorthand
        end_user = await cdp.end_user.get_end_user(user_id=user_id)
        await end_user.revoke_delegation_for_address(address=address)
        print("Revoked delegation via account method")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python revoke_delegation_for_address.py <USER_UUID> <ADDRESS>")
        sys.exit(1)

    asyncio.run(main(sys.argv[1], sys.argv[2]))
