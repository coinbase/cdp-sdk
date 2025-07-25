# Usage: uv run python evm/account.sign_typed_data.py

import asyncio

from cdp import CdpClient
from cdp.evm_message_types import EIP712Domain
import dotenv

dotenv.load_dotenv()


async def main():
    async with CdpClient() as cdp:
        account = await cdp.evm.get_or_create_account(name="Account1")
        domain = EIP712Domain(
            name="EIP712Domain",
            chain_id=1,
            verifying_contract="0x0000000000000000000000000000000000000000",
        ).as_dict()
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
            "chainId": 1,
            "verifyingContract": "0x0000000000000000000000000000000000000000",
        }
        signature = await account.sign_typed_data(
            domain=domain,
            types=types,
            primary_type=primary_type,
            message=message,
        )
        print("Signature: ", signature)


asyncio.run(main())
