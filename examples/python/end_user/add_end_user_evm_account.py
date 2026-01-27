# Usage: uv run python end_user/add_end_user_evm_account.py

import asyncio

from cdp import CdpClient
from cdp.openapi_client.models.authentication_method import AuthenticationMethod
from cdp.openapi_client.models.create_end_user_request_evm_account import (
    CreateEndUserRequestEvmAccount,
)
from cdp.openapi_client.models.email_authentication import EmailAuthentication
from dotenv import load_dotenv

load_dotenv()


async def main():
    async with CdpClient() as cdp:
        try:
            # Create an end user with an EVM EOA (Externally Owned Account).
            end_user = await cdp.end_user.create_end_user(
                authentication_methods=[
                    AuthenticationMethod(EmailAuthentication(type="email", email="user@example.com"))
                ],
                evm_account=CreateEndUserRequestEvmAccount(create_smart_account=False),
            )

            print("Created end user:", end_user.user_id)
            print("Initial EVM accounts:", end_user.evm_accounts)

            # Add another EVM EOA to the same end user.
            result = await cdp.end_user.add_end_user_evm_account(
                user_id=end_user.user_id,
            )

            print("Added EVM account:", result.evm_account.address)
            print("Account created at:", result.evm_account.created_at)

        except Exception as e:
            print(f"Error: {e}")
            raise e


asyncio.run(main())
