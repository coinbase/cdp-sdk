# Usage: uv run python end_user/create_end_user.py

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
            # Create an end user with an email authentication method and an EVM account.
            end_user = await cdp.end_user.create_end_user(
                authentication_methods=[
                    AuthenticationMethod(EmailAuthentication(type="email", email="user+3@example.com"))
                ],
                evm_account=CreateEndUserRequestEvmAccount(create_smart_account=False),
            )

            print("Created end user:", end_user)

            # Create an end user with an email authentication method and a smart account.
            end_user_with_smart_account = await cdp.end_user.create_end_user(
                authentication_methods=[
                    AuthenticationMethod(EmailAuthentication(type="email", email="user+4@example.com"))
                ],
                evm_account=CreateEndUserRequestEvmAccount(create_smart_account=True),
            )

            print("Created end user with smart account:", end_user_with_smart_account)

            # Create an end user with an email authentication method and a smart account with spend permissions.
            end_user_with_smart_account_and_spend_permissions = await cdp.end_user.create_end_user(
                authentication_methods=[
                    AuthenticationMethod(EmailAuthentication(type="email", email="user+5@example.com"))
                ],
                evm_account=CreateEndUserRequestEvmAccount(create_smart_account=True, enable_spend_permissions=True),
            )

            print("Created end user with smart account and spend permissions:", end_user_with_smart_account_and_spend_permissions)

        except Exception as e:
            print(f"Error creating end user: {e}")
            raise e


asyncio.run(main())

