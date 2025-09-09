# Usage: uv run python solana/policies/create_sol_message_policy.py

import asyncio

from cdp import CdpClient
from dotenv import load_dotenv
from cdp.policies.types import (
    CreatePolicyOptions,
    SignSolMessageRule,
    SolMessageCriterion,
)

load_dotenv()

async def main():
    async with CdpClient() as cdp:
        # Create a policy that only allows signing messages starting with "CDP:"
        policy = CreatePolicyOptions(
            scope="account",
            description="Allow messages with CDP prefix only",
            rules=[
                SignSolMessageRule(
                    action="accept",
                    criteria=[
                        SolMessageCriterion(
                            type="solMessage",
                            match="^CDP:.*",
                        ),
                    ],
                ),
            ],
        )

        result = await cdp.policies.create_policy(policy=policy)

        print("Created sol message policy: ", result.id)


asyncio.run(main())
