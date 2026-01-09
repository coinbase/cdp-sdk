# Usage: uv run python end_user/import_end_user.py

import asyncio

from cdp import CdpClient
from cdp.openapi_client.models.authentication_method import AuthenticationMethod
from cdp.openapi_client.models.email_authentication import EmailAuthentication
from dotenv import load_dotenv
from eth_account import Account

load_dotenv()


async def main():
    async with CdpClient() as cdp:
        try:
            # Generate a random private key and derive the EVM address.
            local_account = Account.create()
            print(f"Generated address: {local_account.address}")

            # Import the end user with the private key.
            end_user = await cdp.end_user.import_end_user(
                authentication_methods=[
                    AuthenticationMethod(EmailAuthentication(type="email", email="test@example.com"))
                ],
                private_key=local_account.key.hex(),
                key_type="evm",
            )

            print(f"Imported end user: {end_user}")
            print(f"End user EVM accounts: {end_user.evm_account_objects}")

            # Fund the address with testnet ETH using the faucet.
            print("Requesting faucet funds...")
            transaction_hash = await cdp.evm.request_faucet(
                address=local_account.address,
                network="base-sepolia",
                token="eth",
            )
            print(f"Faucet funds requested. Explorer: https://sepolia.basescan.org/tx/{transaction_hash}")

        except Exception as e:
            print(f"Error importing end user: {e}")
            raise e


asyncio.run(main())
