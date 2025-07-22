# Usage:
# uv run python evm/wait_user_operation.py
#   [--owner <owner_address>] - optional address of the owner of the smart account, if not
#       provided, a new account will be created
#   [--smart_account <smart_account_address>] - optional address of the smart account, if not provided,
#       a new smart account will be created and funded from the faucet
#   [--destinations <destination_addresses>] - optional, a comma separated list of destination
#       addresses. If not a default set of destination addresses will be used.
#   [--amount <amount_in_wei>] - optional, if not provided, a default amount of 1000 lamports
#       will be used

import asyncio
from decimal import Decimal
import argparse
from web3 import Web3

from cdp import CdpClient
from cdp.evm_call_types import EncodedCall
from dotenv import load_dotenv

load_dotenv()

# The static address mapped to ETH when listing token balances
ETH_ADDRESS = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"


async def main():
    parser = argparse.ArgumentParser(description="Solana transfer script")
    parser.add_argument(
        "--owner",
        help="Owner address (if not provided, a new account will be created)",
    )
    parser.add_argument(
        "--smart_account",
        help="Smart account address (if not provided, a new smart account will be created)",
    )
    parser.add_argument(
        "--destinations",
        default="0xba5f3764f0A714EfaEDC00a5297715Fd75A416B7,0xD84523e4F239190E9553ea59D7e109461752EC3E,0xf1F7Bf05A81dBd5ACBc701c04ce79FbC82fEAD8b",
        help="Destination address",
    )
    parser.add_argument(
        "--amount",
        type=int,
        default=1000,
        help="Amount in wei to send (default: 1000)",
    )
    args = parser.parse_args()

    w3 = Web3(Web3.HTTPProvider("https://sepolia.base.org"))

    async with CdpClient() as cdp:
        owner_address = args.owner
        smart_account_address = args.smart_account
        destinations = args.destinations.split(",")
        amount = args.amount

        if not owner_address or not smart_account_address:
            account = await cdp.evm.create_account()
            print("Created owner account:", account.address)
            smart_account = await cdp.evm.create_smart_account(account)
            print("Created smart account:", smart_account.address)
        else:
            owner = await cdp.evm.get_account(owner_address)
            print("Got owner account:", owner.address)
            smart_account = await cdp.evm.get_smart_account(
                smart_account_address, owner
            )
            print("Got smart account:", smart_account.address)

        # Get the ETH balance of the smart account
        balance_response = await cdp.evm.list_token_balances(
            smart_account.address, "base-sepolia"
        )
        eth_balance = next(
            (
                balance
                for balance in balance_response.balances
                if balance.token.contract_address == ETH_ADDRESS
            ),
            None,
        )
        if eth_balance:
            print(f"ETH balance of smart account in wei: {eth_balance.amount.amount}")
        else:
            print("No ETH balance found for smart account")
            print("Requesting faucet to smart account")
            faucet_hash = await cdp.evm.request_faucet(
                address=smart_account.address, network="base-sepolia", token="eth"
            )

            w3.eth.wait_for_transaction_receipt(faucet_hash)
            print(
                "Faucet funds received. Transaction explorer link:",
                f"https://sepolia.basescan.org/tx/{faucet_hash}",
            )

        # Create the user operation with multiple calls in it
        calls = [
            EncodedCall(
                to=destination,
                data="0x",
                value=Web3.to_wei(Decimal(amount), "wei"),
            )
            for destination in destinations
        ]

        print("Sending user operation")
        user_operation = await cdp.evm.send_user_operation(
            smart_account=smart_account,
            calls=calls,
            network="base-sepolia",
        )

        print("Sent user operation with user op hash:", user_operation.user_op_hash)

        print("Waiting for user operation...")
        user_operation = await cdp.evm.wait_for_user_operation(
            smart_account_address=smart_account.address,
            user_op_hash=user_operation.user_op_hash,
        )

        if user_operation.status == "complete":
            print(
                "User operation sent. Transaction explorer link:",
                f"https://sepolia.basescan.org/tx/{user_operation.transaction_hash}",
            )
        else:
            print("User operation failed.")


asyncio.run(main())
