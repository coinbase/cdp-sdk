# Usage: uv run python end_user/add_end_user_evm_smart_account.py

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
            # Create an end user with an EVM smart account.
            end_user = await cdp.end_user.create_end_user(
                authentication_methods=[
                    AuthenticationMethod(EmailAuthentication(type="email", email="user@example.com"))
                ],
                evm_account=CreateEndUserRequestEvmAccount(
                    create_smart_account=True, enable_spend_permissions=True
                ),
            )

            print("Created end user:", end_user.user_id)
            print("Initial EVM accounts:", end_user.evm_accounts)
            print("Initial EVM smart accounts:", end_user.evm_smart_accounts)

            # Add another EVM smart account to the same end user.
            result = await cdp.end_user.add_end_user_evm_smart_account(
                user_id=end_user.user_id,
                enable_spend_permissions=True,
            )

            print("Added EVM smart account:", result.evm_smart_account.address)
            print("Owner addresses:", result.evm_smart_account.owner_addresses)
            print("Account created at:", result.evm_smart_account.created_at)

        except Exception as e:
            print(f"Error: {e}")
            raise e


asyncio.run(main())
