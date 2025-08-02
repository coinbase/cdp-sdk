# Usage: uv run python policies/create_spl_token_limits_policy.py

import asyncio

from cdp import CdpClient
from dotenv import load_dotenv
from cdp.policies.types import (
    CreatePolicyOptions,
    SendSolanaTransactionRule,
    SplValueCriterion,
    MintAddressCriterion,
)

load_dotenv()

async def main():
    async with CdpClient() as cdp:
        policy = CreatePolicyOptions(
            scope="account",
            description="SPL Token Limits Policy",
            rules=[
                SendSolanaTransactionRule(
                    action="accept",
                    criteria=[
                        SplValueCriterion(
                            splValue="1000000",
                            operator="<=",
                        ),
                        MintAddressCriterion(
                            addresses=["4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"],
                            operator="in",
                        ),
                    ],
                ),
            ],
        )

        result = await cdp.policies.create_policy(policy=policy)

        print("Created spl token limits policy: ", result.id)


asyncio.run(main())
