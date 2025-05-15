# Usage: uv run python policies/create_account_policy.py

import asyncio

from cdp import CdpClient
from dotenv import load_dotenv
from cdp.policies.types import CreatePolicy, EthValueCriterion, EvmAddressCriterion, SignEvmTransactionRule

load_dotenv()

async def main():
    async with CdpClient() as cdp:
        policy = CreatePolicy(
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
                        EvmAddressCriterion(
                            addresses=["0x1234567890123456789012345678901234567890"],
                            operator="in",
                        ),
                    ],
                )
            ],
        )

        result = await cdp.policies.create_policy(policy=policy)

        print("Created account policy: ", result.id)


asyncio.run(main())
