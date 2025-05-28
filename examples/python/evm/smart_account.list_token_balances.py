# Usage: uv run python evm/smart_account.list_token_balances.py

import asyncio
from cdp import CdpClient
from web3 import Web3
from dotenv import load_dotenv

load_dotenv()


async def main():
    async with CdpClient() as cdp:
        account = await cdp.evm.get_or_create_account(name="MyAccount")
        smart_account = await cdp.evm.create_smart_account(owner=account)

        transaction_hash = await cdp.evm.request_faucet(
            address=smart_account.address,
            network="base-sepolia",
            token="eth",
        )
        w3 = Web3(Web3.HTTPProvider("https://sepolia.base.org"))
        w3.eth.wait_for_transaction_receipt(transaction_hash)

        balances = await smart_account.list_token_balances(
            network="base-sepolia",
            page_size=10,
        )

        for balance in balances.balances:
            print(f"Token contract address: {balance.token.contract_address}")
            print(f"Token balance: {balance.amount.amount}")


asyncio.run(main())
