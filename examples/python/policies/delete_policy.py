# Usage: uv run python policies/delete_policy.py

import asyncio

from cdp import CdpClient
from dotenv import load_dotenv
from cdp.policies.types import CreatePolicyOptions, EthValueCriterion, SignEvmTransactionRule

load_dotenv()

async def main():
    async with CdpClient() as cdp:
        policy = CreatePolicyOptions(
            scope="account",
            description="Temporary Policy",
            rules=[
                SignEvmTransactionRule(
                    action="accept",
                    criteria=[
                        EthValueCriterion(
                            ethValue="1000000000000000000",
                            operator="<=",
                        ),
                    ],
                )
            ],
        )

        result = await cdp.policies.create_policy(policy=policy)
        print("Created account policy: ", result.id)

        print("Deleting account policy: ", result.id)
        await cdp.policies.delete_policy(id=result.id)
        print("Deleted account policy: ", result.id)


asyncio.run(main())
