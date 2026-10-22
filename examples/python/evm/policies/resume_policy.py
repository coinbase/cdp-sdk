# Usage: uv run python evm/policies/resume_policy.py

import asyncio

from cdp import CdpClient
from cdp.policies.types import CreatePolicyOptions, EvmAddressCriterion, SignEvmTransactionRule
from dotenv import load_dotenv

load_dotenv()


async def main():
    """Create an account policy, pause it indefinitely, and resume it."""
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
        await cdp.policies.pause_policy(id=result.id)
        resumed_policy = await cdp.policies.resume_policy(id=result.id)
        print("Status: ", resumed_policy.status)


asyncio.run(main())
