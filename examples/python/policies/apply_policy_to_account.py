# Usage: uv run python policies/apply_policy_to_account.py

import asyncio

from cdp import CdpClient, UpdateAccountOptions
from dotenv import load_dotenv

load_dotenv()


async def main():
    async with CdpClient() as cdp:
        policy = {
            "scope": "account",
            "description": "Account Allowlist Example",
            "rules": [
                {
                    "action": "accept",
                    "operation": "signEvmTransaction",
                    "criteria": [
                        {
                            "type": "ethValue",
                            "ethValue": "1000000000000000000",
                            "operator": "<=",
                        },
                    ],
                }
            ],
        }

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
