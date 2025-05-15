# Usage: uv run python policies/get_policy_by_id.py

import asyncio

from cdp import CdpClient
from dotenv import load_dotenv
from cdp.policies.types import CreatePolicyOptions, EthValueCriterion, SignEvmTransactionRule

load_dotenv()

async def main():
    async with CdpClient() as cdp:
        policy = CreatePolicyOptions(
            scope="account",
            description="Account Allowlist Example",
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
        print("Created policy: ", result)

        print("Retrieving policy by id: ", result.id)
        policy = await cdp.policies.get_policy_by_id(result.id)
        print("Retrieved policy: ", policy)


asyncio.run(main())
