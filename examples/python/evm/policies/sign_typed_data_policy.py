# Usage: uv run python evm/policies/sign_typed_data_policy.py

import asyncio

from cdp import CdpClient
from cdp.evm_message_types import EIP712Domain
from dotenv import load_dotenv
from cdp.policies.types import (
    CreatePolicyOptions,
    SignEvmTypedDataRule,
    SignEvmTypedDataFieldCriterion,
    SignEvmTypedDataTypes,
    EvmTypedNumericalCondition,
)

load_dotenv()


async def main():
    async with CdpClient() as cdp:
        # Create the permit policy
        permit_policy = CreatePolicyOptions(
            scope="account",
            description="SignTypedData Test Policy",
            rules=[
                SignEvmTypedDataRule(
                    action="accept",
                    criteria=[
                        SignEvmTypedDataFieldCriterion(
                            types=SignEvmTypedDataTypes(
                                primaryType="Permit",
                                types={
                                    "EIP712Domain": [
                                        {"name": "name", "type": "string"},
                                        {"name": "version", "type": "string"},
                                        {"name": "chainId", "type": "uint256"},
                                        {
                                            "name": "verifyingContract",
                                            "type": "address",
                                        },
                                    ],
                                    "Permit": [
                                        {"name": "value", "type": "uint256"},
                                    ],
                                },
                            ),
                            conditions=[
                                EvmTypedNumericalCondition(
                                    path="value",
                                    operator="<=",
                                    value="1000000000000000000000",  # Max 1000 tokens (assuming 18 decimals)
                                ),
                            ],
                        ),
                    ],
                ),
            ],
        )

        result = await cdp.policies.create_policy(policy=permit_policy)
        print("Created permit policy. Policy ID:", result.id)

        # Create an account with the policy
        account = await cdp.evm.create_account(account_policy=result.id)

        # Sign typed data that's permitted by the policy
        signature = await account.sign_typed_data(
            domain=EIP712Domain(
                name="Test",
            ).as_dict(),
            types={
                "EIP712Domain": [
                    {"name": "name", "type": "string"},
                ],
                "Permit": [{"name": "value", "type": "uint256"}],
            },
            primary_type="Permit",
            message={
                "value": "1000000000000000000000",  # 1000 tokens - within limit
            },
        )

        print("Signature:", signature)

        # Try to sign typed data that's not permitted by the policy
        try:
            await account.sign_typed_data(
                domain=EIP712Domain(
                    name="Test",
                ).as_dict(),
                types={
                    "EIP712Domain": [
                        {"name": "name", "type": "string"},
                    ],
                    "Permit": [{"name": "value", "type": "uint256"}],
                },
                primary_type="Permit",
                message={
                    "value": "1000000000000000000001",  # 1000 tokens + 1 wei - exceeds limit
                },
            )
        except Exception as error:
            print("Error:", error)


asyncio.run(main())
