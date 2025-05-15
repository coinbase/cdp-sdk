# Usage: uv run python policies/create_project_policy.py

import asyncio

from cdp import CdpClient
from dotenv import load_dotenv
from cdp.policies.types import CreatePolicyOptions, SignEvmTransactionRule, EthValueCriterion, EvmAddressCriterion

load_dotenv()

async def main():
    async with CdpClient() as cdp:
        policy = CreatePolicyOptions(
            scope="project",
            description="Project Allowlist Example",
            rules=[
                SignEvmTransactionRule(
                    action="accept",
                    criteria=[
                        EthValueCriterion(
                            ethValue="1000000000000000000",
                            operator="<=",
                        ),
                        EvmAddressCriterion(
                            addresses=["0x000000000000000000000000000000000000dEaD"],
                            operator="in",
                        ),
                    ],
                )
            ],
        )

        result = await cdp.policies.create_policy(policy=policy)

        print("Created project policy: ", result.id)


asyncio.run(main())
