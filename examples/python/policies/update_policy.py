# Usage: uv run python policies/update_policy.py

import asyncio

from cdp import CdpClient
from dotenv import load_dotenv

load_dotenv()

async def main():
    async with CdpClient() as cdp:
        policy = {
            "scope": "account",
            "description": "Initial Allowlist Policy",
            "rules": [
                {
                    "action": "accept",
                    "operation": "signEvmTransaction",
                    "criteria": [
                        {
                            "type": "evmAddress",
                            "addresses": ["0x000000000000000000000000000000000000dEaD"],
                            "operator": "in"
                        }
                    ]
                }
            ]
        }
        result = await cdp.policies.create_policy(policy=policy)
        print("Created account policy: ", result.id)

        updated_policy = {
            "description": "Updated Denylist Policy",
            "rules": [
                {
                    "action": "accept",
                    "operation": "signEvmTransaction",
                    "criteria": [
                        {
                            "type": "evmAddress",
                            "addresses": ["0x000000000000000000000000000000000000dEaD"],
                            "operator": "not in"
                        }
                    ]
                }
            ]
        }

        print("Updating account policy: ", result.id)
        updated_result = await cdp.policies.update_policy(id=result.id, policy=updated_policy)
        print("Updated account policy: ", updated_result)


asyncio.run(main())
