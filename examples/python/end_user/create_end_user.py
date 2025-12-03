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
                    AuthenticationMethod(EmailAuthentication(type="email", email="user@example.com"))
                ],
                evm_account=CreateEndUserRequestEvmAccount(create_smart_account=False),
            )

            print("Created end user:", end_user)

        except Exception as e:
            print(f"Error creating end user: {e}")
            raise e


asyncio.run(main())

