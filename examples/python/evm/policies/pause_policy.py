# Usage: uv run python evm/policies/pause_policy.py

import asyncio
from datetime import datetime, timedelta, timezone

from cdp import CdpClient
from cdp.policies.types import CreatePolicyOptions, EvmAddressCriterion, SignEvmTransactionRule
from dotenv import load_dotenv

load_dotenv()


async def main():
    """Create an account policy and pause it for one hour."""
    async with CdpClient() as cdp:
        policy = CreatePolicyOptions(
            scope="account",
            description="Allowlist Policy",
            rules=[
                SignEvmTransactionRule(
                    action="accept",
                    criteria=[
                        EvmAddressCriterion(
                            addresses=["0x000000000000000000000000000000000000dEaD"],
                            operator="in",
                        ),
                    ],
                )
            ],
        )

        result = await cdp.policies.create_policy(policy=policy)
        paused_policy = await cdp.policies.pause_policy(
            id=result.id,
            resume_at=datetime.now(timezone.utc) + timedelta(hours=1),
        )
        print("Status: ", paused_policy.status)
        print("Paused at: ", paused_policy.paused_at)
        print("Resume at: ", paused_policy.resume_at)


asyncio.run(main())
