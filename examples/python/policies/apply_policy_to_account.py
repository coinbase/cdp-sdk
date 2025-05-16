# Usage: uv run python policies/apply_policy_to_account.py

import asyncio

from cdp import CdpClient, UpdateAccountOptions
from cdp.policies.types import (
    CreatePolicyOptions,
    EthValueCriterion,
    EvmAddressCriterion,
    SignEvmTransactionRule,
    EvmNetworkCriterion,
    SendEvmTransactionRule,
    SolanaAddressCriterion,
    SignSolanaTransactionRule,
)
from dotenv import load_dotenv

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
                SignSolanaTransactionRule(
                    action="accept",
                    criteria=[
                        SolanaAddressCriterion(
                            addresses=["123456789abcdef123456789abcdef12"],
                            operator="in",
                        ),
                    ],
                ),
            ],
        )

        result = await cdp.policies.create_policy(policy=policy)

        print("Created account policy:", result.id)

        account = await cdp.evm.create_account()
        print("Created account:", account.address)

        updated_account = await cdp.evm.update_account(
            address=account.address,
            update=UpdateAccountOptions(account_policy=result.id),
        )
        print("Updated account. Policies:", updated_account.policies)


asyncio.run(main())
