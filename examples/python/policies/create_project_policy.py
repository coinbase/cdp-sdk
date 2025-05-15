# Usage: uv run python policies/create_project_policy.py

import asyncio

from cdp import CdpClient
from dotenv import load_dotenv

load_dotenv()

async def main():
    async with CdpClient() as cdp:
        policy = {
            "scope": "project",
            "description": "Project Allowlist Example",
            "rules": [
                {
                    "action": "accept",
                    "operation": "signEvmTransaction",
                    "criteria": [
                        {
                            "type": "ethValue",
                            "ethValue": "1000000000000000000",
                            "operator": "<="
                        },
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

        print("Created project policy: ", result.id)


asyncio.run(main())
