# Usage: uv run python end_user/list_end_users.py

import asyncio
from cdp import CdpClient
from dotenv import load_dotenv

load_dotenv()


async def main():
    async with CdpClient() as cdp:
        try:
            # List all end users with default pagination (20 per page)
            result = await cdp.end_user.list_end_users(
                page_size=2,
                sort=["createdAt=asc"]
            )
            
            print(f"Found {len(result.end_users)} end users on first page")
            for end_user in result.end_users:
                print(f"  - User ID: {end_user.user_id}")
                print(f"    EVM Accounts: {end_user.evm_accounts}")
                print(f"    EVM Smart Accounts: {end_user.evm_smart_accounts}")
                print(f"    Solana Accounts: {end_user.solana_accounts}")
                print()

        except Exception as e:
            print(f"Error listing end users: {e}")
            raise e


asyncio.run(main())

