# Usage: uv run python policies/create_account_policy.py

import asyncio

from cdp import CdpClient
from dotenv import load_dotenv
from cdp.policies.types import (
    CreatePolicyOptions,
    EthValueCriterion,
    EvmAddressCriterion,
    EvmNetworkCriterion,
    SendEvmTransactionRule,
    SignEvmTransactionRule,
    SignEvmHashRule,
    SignEvmMessageRule,
    EvmMessageCriterion,
    SignSolanaTransactionRule,
    SolanaAddressCriterion,
)

load_dotenv()

async def main():
    async with CdpClient() as cdp:
        policy = CreatePolicyOptions(
            scope="account",
            description="Account Allowlist Example",
            rules=[
                SendEvmTransactionRule(
                    action="accept",
                    criteria=[
                        EvmNetworkCriterion(
                            networks=["base-sepolia", "base"],
                            operator="in",
                        ),
                    ],
                ),
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
                ),
                SignEvmHashRule(
                    action="accept",
                ),
                SignEvmMessageRule(
                    action="accept",
                    criteria=[
                        EvmMessageCriterion(
                            match=".*",
                        ),
                    ],
                ),
                SignSolanaTransactionRule(
                    action="accept",
                    criteria=[
                        SolanaAddressCriterion(
                            addresses=["123456789abcdef123456789abcdef12"],
                            operator="in",
                        ),
                    ],
                )
            ],
        )

        result = await cdp.policies.create_policy(policy=policy)

        print("Created account policy: ", result.id)


asyncio.run(main())
