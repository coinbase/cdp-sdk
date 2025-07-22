# Usage: uv run python evm/account.sign_typed_data.py

import asyncio

from cdp import CdpClient
import dotenv

dotenv.load_dotenv()


async def main():
    async with CdpClient() as cdp:
        owner = await cdp.evm.get_or_create_account(name="SignTypedData-Example-Owner")
        smart_account = await cdp.evm.get_or_create_smart_account(
            name="SignTypedData-Example-SmartAccount",
            owner=owner,
        )

        domain = {
            "name": "EIP712Domain",
            "chainId": 84532,
            "verifyingContract": "0x0000000000000000000000000000000000000000",
        }

        types = {
            "EIP712Domain": [
                {"name": "name", "type": "string"},
                {"name": "chainId", "type": "uint256"},
                {"name": "verifyingContract", "type": "address"},
            ],
        }
        primary_type = "EIP712Domain"
        message = {
            "name": "EIP712Domain",
            "chainId": 84532,
            "verifyingContract": "0x0000000000000000000000000000000000000000",
        }

        signature = await smart_account.sign_typed_data(
            domain=domain,
            types=types,
            primary_type=primary_type,
            message=message,
            network="base-sepolia",
        )
        print("Signature: ", signature)


asyncio.run(main())
