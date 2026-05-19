# Usage: uv run python custody/list_accounts_and_transfer.py
#
# Demonstrates the Flexible Custody API flow:
#   1. List accounts
#   2. Get balances for the first account
#   3. Create a quoted transfer (not executed)
#   4. List recent transfers

import asyncio

from cdp import CdpClient
from cdp.openapi_client.api.accounts_api import AccountsApi
from cdp.openapi_client.api.transfers_api import TransfersApi
from cdp.openapi_client.models import TransferRequest
from dotenv import load_dotenv

load_dotenv()


async def main():
    async with CdpClient() as cdp:
        api_client = cdp._api_client
        accounts_api = AccountsApi(api_client)
        transfers_api = TransfersApi(api_client)

        # 1. List accounts
        response = await accounts_api.list_foundation_accounts()
        accounts = response.accounts
        print(f"Found {len(accounts)} accounts:")
        for account in accounts:
            print(f"  {account.account_id} ({account.name}) - type: {account.type}")

        if not accounts:
            print("No accounts found. Create one in the CDP dashboard first.")
            return

        # 2. Get balances for the first account
        account = accounts[0]
        balances_response = await accounts_api.list_balances(account.account_id)
        print(f"\nBalances for {account.name}:")
        for balance in balances_response.balances:
            print(f"  {balance.asset}: {balance.amount}")

        # 3. Create a quoted transfer (execute=False — no funds move)
        transfer = await transfers_api.create_transfer(
            transfer_request=TransferRequest(
                source={"accountId": account.account_id, "asset": "usd"},
                target={
                    "address": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
                    "network": "base",
                    "asset": "usdc",
                },
                amount="10.00",
                asset="usd",
                execute=False,
            )
        )
        print(f"\nCreated transfer {transfer.transfer_id}:")
        print(f"  Status: {transfer.status}")
        print(f"  Source: {transfer.source_amount} {transfer.source_asset}")
        print(f"  Target: {transfer.target_amount} {transfer.target_asset}")
        print(f"  Expires: {transfer.expires_at}")

        # 4. List recent transfers
        transfers_response = await transfers_api.list_transfers(status="quoted")
        print(f"\n{len(transfers_response.transfers)} quoted transfers found.")


asyncio.run(main())
