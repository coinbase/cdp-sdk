# Usage: uv run python evm/list_token_balances.py

import asyncio

from cdp import CdpClient
from dotenv import load_dotenv

load_dotenv()


async def main():
    async with CdpClient() as cdp:
        address = "0x5b76f5B8fc9D700624F78208132f91AD4e61a1f0"
        network = "base-sepolia"
        token_balances = await cdp.evm.list_token_balances(address, network)

        for balance in token_balances.balances:
            print(
                f"Contract Address: {balance.token.contract_address} Balance: {balance.amount.amount}"
            )


asyncio.run(main())
