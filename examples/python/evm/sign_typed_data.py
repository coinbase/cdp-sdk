# Usage: uv run python evm/sign_typed_data.py

import asyncio

from cdp import CdpClient
from cdp.openapi_client.models.eip712_domain import EIP712Domain
from cdp.openapi_client.models.eip712_message import EIP712Message


async def main():
    async with CdpClient() as cdp:
        account = await cdp.evm.get_or_create_account(name="MyAccount")
        signature = await cdp.evm.sign_typed_data(
            address=account.address,
            message=EIP712Message(
                domain=EIP712Domain(
                    name="EIP712Domain",
                    chain_id=1,
                    verifying_contract="0x0000000000000000000000000000000000000000",
                ),
                types={
                    "EIP712Domain": [
                        {"name": "name", "type": "string"},
                        {"name": "chainId", "type": "uint256"},
                        {"name": "verifyingContract", "type": "address"},
                    ],
                },
                primary_type="EIP712Domain",
                message={
                    "name": "EIP712Domain",
                    "chainId": 1,
                    "verifyingContract": "0x0000000000000000000000000000000000000000",
                },
            ),
        )
        print("Signature: ", signature)


asyncio.run(main())
