# Usage: uv run python cdp/examples/evm/list_token_balances.py

import asyncio

from dotenv import load_dotenv

from cdp import CdpClient


async def main():
    """Contains main function for the EVM token balances script."""
    load_dotenv()

    async with CdpClient() as cdp:
        address = "0x5b76f5B8fc9D700624F78208132f91AD4e61a1f0"
        network = "base-sepolia"
        token_balances = await cdp.evm.list_token_balances(address, network)

        for balance in token_balances.balances:
            print(
                f"Contract Address: {balance.token.contract_address} Balance: {balance.amount.amount}"
            )


# Run the async function
asyncio.run(main())
