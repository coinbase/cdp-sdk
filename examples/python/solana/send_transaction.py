# Usage:
# uv run python solana/send_transaction.py
#   [--sender <sender_address>] - optional, if not provided, a new account will be created and funded from the faucet
#   [--destination <destination_address>] - optional, if not provided, a default destination address will be used
#   [--amount <amount_in_lamports>] - optional, if not provided, a default amount of 1000 lamports will be used

import argparse
import asyncio
import base64
import time

from solana.rpc.api import Client as SolanaClient
from solana.rpc.types import TxOpts
from solders.message import Message
from solders.pubkey import Pubkey as PublicKey
from solders.system_program import TransferParams, transfer

from cdp import CdpClient
from dotenv import load_dotenv

load_dotenv()


async def create_account(cdp: CdpClient):
    print("Creating account...")
    account = await cdp.solana.create_account()
    print(f"Successfully created account: {account.address}")
    return account.address


async def request_faucet(cdp: CdpClient, address: str):
    print(f"Requesting SOL from faucet for {address}...")
    try:
        response = await cdp.solana.request_faucet(address=address, token="sol")
        transaction_signature = response.transaction_signature
        print(f"Successfully requested SOL from faucet: {transaction_signature}")
        return transaction_signature
    except Exception as e:
        print(f"Faucet request failed: {e}")
        if hasattr(e, "body"):
            print(f"Faucet error body: {e.body}")
        raise


async def wait_for_balance(connection: SolanaClient, address: str):
    print("Waiting for faucet funds...")
    source_pubkey = PublicKey.from_string(address)

    balance = 0
    max_attempts = 30
    attempts = 0

    while balance == 0 and attempts < max_attempts:
        try:
            balance_resp = connection.get_balance(source_pubkey)
            balance = balance_resp.value
            if balance == 0:
                print("Waiting for faucet funds...")
                time.sleep(1)
            else:
                print(f"Account funded with {balance / 1e9} SOL ({balance} lamports)")
                return balance
        except Exception as e:
            print(f"Error checking balance: {e}")
            time.sleep(1)
        attempts += 1

    if balance == 0:
        raise ValueError("Timed out waiting for faucet to fund account")

    return balance


async def send_transaction(
    cdp: CdpClient,
    sender_address: str,
    destination_address: str,
    amount: int = 1000,
):
    connection = SolanaClient("https://api.devnet.solana.com")

    source_pubkey = PublicKey.from_string(sender_address)
    dest_pubkey = PublicKey.from_string(destination_address)

    print(
        f"Preparing to send {amount} lamports from {sender_address} to {destination_address}"
    )

    blockhash_resp = connection.get_latest_blockhash()
    blockhash = blockhash_resp.value.blockhash

    transfer_params = TransferParams(
        from_pubkey=source_pubkey, to_pubkey=dest_pubkey, lamports=amount
    )
    transfer_instr = transfer(transfer_params)

    message = Message.new_with_blockhash(
        [transfer_instr],
        source_pubkey,
        blockhash,
    )

    # Create a transaction envelope with signature space
    sig_count = bytes([1])  # 1 byte for signature count (1)
    empty_sig = bytes([0] * 64)  # 64 bytes of zeros for the empty signature
    message_bytes = bytes(message)  # Get the serialized message bytes

    # Concatenate to form the transaction bytes
    tx_bytes = sig_count + empty_sig + message_bytes

    # Encode to base64 used by CDP API
    serialized_tx = base64.b64encode(tx_bytes).decode("utf-8")

    print("Signing transaction...")

    try:
        response = await cdp.solana.sign_transaction(
            sender_address, transaction=serialized_tx
        )
        signed_tx = response.signed_transaction
        print("Transaction signed successfully")
    except Exception as e:
        print(f"Error signing transaction: {e}")
        if hasattr(e, "body"):
            print(f"Error body: {e.body}")
        raise

    # Decode the signed transaction from base64
    decoded_signed_tx = base64.b64decode(signed_tx)

    print("Sending transaction to network...")
    tx_resp = connection.send_raw_transaction(
        decoded_signed_tx,
        opts=TxOpts(skip_preflight=False, preflight_commitment="processed"),
    )
    signature = tx_resp.value
    print(f"Solana transaction hash: {signature}")

    print("Confirming transaction...")
    confirmation = connection.confirm_transaction(signature, commitment="processed")

    if hasattr(confirmation, "err") and confirmation.err:
        raise ValueError(f"Transaction failed: {confirmation.err}")

    print(
        f"Transaction confirmed: {'failed' if hasattr(confirmation, 'err') and confirmation.err else 'success'}"
    )
    print(
        f"Transaction explorer link: https://explorer.solana.com/tx/{signature}?cluster=devnet"
    )

    return signature


async def main():
    parser = argparse.ArgumentParser(description="Solana transfer script")
    parser.add_argument(
        "--sender",
        help="Sender address (if not provided, a new account will be created)",
    )
    parser.add_argument(
        "--destination",
        default="3KzDtddx4i53FBkvCzuDmRbaMozTZoJBb1TToWhz3JfE",
        help="Destination address",
    )
    parser.add_argument(
        "--amount",
        type=int,
        default=1000,
        help="Amount in lamports to send (default: 1000)",
    )
    args = parser.parse_args()

    async with CdpClient() as cdp:
        connection = SolanaClient("https://api.devnet.solana.com")

        try:
            sender_address = args.sender

            # If no sender address is provided, create a new account and faucet it
            if not sender_address:
                print(
                    "No sender address provided. Creating a new account and requesting funds..."
                )
                sender_address = await create_account(cdp)
                await request_faucet(cdp, sender_address)
                await wait_for_balance(connection, sender_address)
            else:
                print(f"Using provided sender address: {sender_address}")
                # Check if there's a balance
                source_pubkey = PublicKey.from_string(sender_address)
                balance_resp = connection.get_balance(source_pubkey)
                balance = balance_resp.value
                print(
                    f"Sender account balance: {balance / 1e9} SOL ({balance} lamports)"
                )

                if balance == 0:
                    print("Account has zero balance, requesting funds from faucet...")
                    await request_faucet(cdp, sender_address)
                    await wait_for_balance(connection, sender_address)

            await send_transaction(cdp, sender_address, args.destination, args.amount)

        except Exception as error:
            print(f"Error in process: {error}")


asyncio.run(main())
