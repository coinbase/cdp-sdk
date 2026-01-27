# Usage: uv run python end_user/add_end_user_solana_account.py

import asyncio

from cdp import CdpClient
from cdp.openapi_client.models.authentication_method import AuthenticationMethod
from cdp.openapi_client.models.create_end_user_request_solana_account import (
    CreateEndUserRequestSolanaAccount,
)
from cdp.openapi_client.models.email_authentication import EmailAuthentication
from dotenv import load_dotenv

load_dotenv()


async def main():
    async with CdpClient() as cdp:
        try:
            # Create an end user with a Solana account.
            end_user = await cdp.end_user.create_end_user(
                authentication_methods=[
                    AuthenticationMethod(EmailAuthentication(type="email", email="user@example.com"))
                ],
                solana_account=CreateEndUserRequestSolanaAccount(create_smart_account=False),
            )

            print("Created end user:", end_user.user_id)
            print("Initial Solana accounts:", end_user.solana_accounts)

            # Add another Solana account to the same end user.
            result = await cdp.end_user.add_end_user_solana_account(
                user_id=end_user.user_id,
            )

            print("Added Solana account:", result.solana_account.address)
            print("Account created at:", result.solana_account.created_at)

        except Exception as e:
            print(f"Error: {e}")
            raise e


asyncio.run(main())
