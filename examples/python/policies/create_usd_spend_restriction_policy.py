# Usage: uv run python policies/create_spl_token_limits_policy.py

import asyncio

from cdp import CdpClient
from dotenv import load_dotenv
from cdp.policies.types import (
    CreatePolicyOptions,
    SendEvmTransactionRule,
    NetUSDChangeCriterion,
)

load_dotenv()

async def main():
    async with CdpClient() as cdp:
        # Create a policy that allows sending up to 100 dollars worth of assets at a time
        policy = CreatePolicyOptions(
            scope="account",
            description="Accept up to 100 dollars",
            rules=[
                SendEvmTransactionRule(
                    action="accept",
                    criteria=[
                        NetUSDChangeCriterion(
                            changeCents=10000,
                            operator="<",
                        ),
                    ],
                ),
            ],
        )

        result = await cdp.policies.create_policy(policy=policy)

        print("Created USD spend restrictions policy: ", result.id)


asyncio.run(main())
