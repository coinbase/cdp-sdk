"""Example: Get the active account-scoped delegation for an end user address.

Usage: python get_delegation_for_account.py <USER_UUID> <ADDRESS>
"""

import asyncio
import sys

from cdp import CdpClient


async def main(user_id: str, address: str) -> None:
    """Get an account-scoped delegation via client method and account shorthand."""
    async with CdpClient() as cdp:
        # Via the client method
        delegation = await cdp.end_user.get_delegation_for_end_user_account(
            user_id=user_id,
            address=address,
        )
        print(f"Delegation via client method: {delegation}")

        # Via the EndUserAccount shorthand
        end_user = await cdp.end_user.get_end_user(user_id=user_id)
        delegation2 = await end_user.get_delegation_for_account(address=address)
        print(f"Delegation via account method: {delegation2}")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python get_delegation_for_account.py <USER_UUID> <ADDRESS>")
        sys.exit(1)

    asyncio.run(main(sys.argv[1], sys.argv[2]))
