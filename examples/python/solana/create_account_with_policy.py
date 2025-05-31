# Usage: uv run python solana/create_account_with_policy.py

import asyncio

from cdp import CdpClient
from dotenv import load_dotenv
from cdp.policies.types import SignSolanaTransactionRule, SolanaAddressCriterion
from cdp.policies.types import CreatePolicyOptions

load_dotenv()


async def main():
    async with CdpClient() as cdp:
        policies = await cdp.policies.list_policies(scope="account")

        if policies.policies:
            print(f"Using existing account policy for new account: {policies.policies[0].id}")
            account_policy=policies.policies[0].id
        else:
            new_policy = await cdp.policies.create_policy(
                policy=CreatePolicyOptions(
                    scope="account",
                    description="Account policy for testing",
                    rules=[
                        SignSolanaTransactionRule(
                            action="accept",
                            criteria=[
                                SolanaAddressCriterion(
                                    addresses=["123456789abcdef123456789abcdef12"],
                                    operator="in",
                                ),
                            ],
                        )
                    ]
                )
            )
            print(f"Created new account policy: {new_policy.id}")
            print(f"Using new account policy for new account: {new_policy.id}")
            account_policy=new_policy.id

        account_name = "AccountWithPolicy"
        account = await cdp.solana.create_account(
            name=account_name,
            account_policy=account_policy,
        )
        print(f"Successfully created account with policy: {account.address}")

        retrieved_account = await cdp.solana.get_account(name=account_name)
        print(f"Retrieved account policies: {retrieved_account.policies}")


asyncio.run(main())
