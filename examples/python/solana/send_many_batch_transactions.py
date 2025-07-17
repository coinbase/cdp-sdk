# Usage:
# uv run python solana/send_many_batch_transactions.py
#   [--sender <sender_address>] - optional, if not provided, a new account will be created and funded from the faucet
#   [--destinations <destination_addresses>] - optional, a comma separated list of destination addresses.
#                                              If not provided, default addresses will be used.
#   [--num-transactions <number>] - optional, number of batch transactions to send (default: 3)
#   [--amount <amount_in_lamports>] - optional, if not provided, a default amount of 1000 lamports will be used

import argparse
import asyncio
import base64
import time

from solana.rpc.api import Client as SolanaClient
from solders.message import Message
from solders.pubkey import Pubkey as PublicKey
from solders.signature import Signature
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


async def send_batch_transaction(
    cdp: CdpClient,
    connection: SolanaClient,
    sender_address: str,
    destination_addresses: list[str],
    amount: int,
    transaction_number: int,
):
    """Send a single transaction with 2 transfers"""
    source_pubkey = PublicKey.from_string(sender_address)
    
    # Take only the first 2 destinations for this batch
    dest_pubkeys = [PublicKey.from_string(address) for address in destination_addresses[:2]]

    print(
        f"Transaction {transaction_number}: Preparing to send {amount} lamports each to 2 addresses from {sender_address}"
    )

    blockhash_resp = connection.get_latest_blockhash()
    blockhash = blockhash_resp.value.blockhash

    # Create 2 transfer instructions
    transfer_instructions = []
    for i, dest_pubkey in enumerate(dest_pubkeys):
        transfer_params = TransferParams(
            from_pubkey=source_pubkey, 
            to_pubkey=dest_pubkey, 
            lamports=amount
        )
        transfer_instr = transfer(transfer_params)
        transfer_instructions.append(transfer_instr)
        print(f"  Transfer {i+1}: {amount} lamports to {destination_addresses[i]}")

    message = Message.new_with_blockhash(
        transfer_instructions,
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

    print(f"Transaction {transaction_number}: Sending to network...")
    tx_resp = await cdp.solana.send_transaction(
        network="solana-devnet",
        transaction=serialized_tx,
    )
    signature = tx_resp.transaction_signature
    print(f"Transaction {transaction_number}: Solana transaction hash: {signature}")

    print(f"Transaction {transaction_number}: Confirming...")
    confirmation = connection.confirm_transaction(
        Signature.from_string(signature), commitment="processed"
    )

    if hasattr(confirmation, "err") and confirmation.err:
        raise ValueError(f"Transaction {transaction_number} failed: {confirmation.err}")

    print(
        f"Transaction {transaction_number}: {'failed' if hasattr(confirmation, 'err') and confirmation.err else 'success'}"
    )
    print(
        f"Transaction {transaction_number}: Explorer link: https://explorer.solana.com/tx/{signature}?cluster=devnet"
    )

    return signature


async def send_many_batch_transactions(
    cdp: CdpClient,
    sender_address: str,
    destination_addresses: list[str],
    num_transactions: int,
    amount: int = 1000,
):
    """Send multiple transactions, each with 2 transfers"""
    connection = SolanaClient("https://api.devnet.solana.com")
    
    print(f"Preparing to send {num_transactions} batch transactions")
    print(f"Each transaction will contain 2 transfers of {amount} lamports each")
    
    # Ensure we have enough destination addresses
    if len(destination_addresses) < 2:
        raise ValueError("Need at least 2 destination addresses for batch transactions")
    
    signatures = []
    
    for i in range(num_transactions):
        print(f"\n--- Batch Transaction {i+1}/{num_transactions} ---")
        
        # Rotate through destination addresses for variety
        # For transaction i, use destinations at indices (2*i) and (2*i+1), wrapping around
        dest_indices = [(2*i) % len(destination_addresses), (2*i+1) % len(destination_addresses)]
        batch_destinations = [destination_addresses[idx] for idx in dest_indices]
        
        try:
            signature = await send_batch_transaction(
                cdp, connection, sender_address, batch_destinations, amount, i+1
            )
            signatures.append(signature)
            
            # Small delay between transactions
            if i < num_transactions - 1:
                print("Waiting 2 seconds before next transaction...")
                await asyncio.sleep(2)
                
        except Exception as e:
            print(f"Transaction {i+1} failed: {e}")
            raise
    
    print(f"\n✅ Successfully sent {len(signatures)} batch transactions!")
    return signatures


async def main():
    parser = argparse.ArgumentParser(description="Solana batch transfer script - sends multiple transactions with 2 transfers each")
    parser.add_argument(
        "--sender",
        help="Sender address (if not provided, a new account will be created)",
    )
    parser.add_argument(
        "--destinations",
        default="ANVUJaJoVaJZELtV2AvRp7V5qPV1B84o29zAwDhPj1c2,EeVPcnRE1mhcY85wAh3uPJG1uFiTNya9dCJjNUPABXzo,4PkiqJkUvxr9P8C1UsMqGN8NJsUcep9GahDRLfmeu8UK,3KzDtddx4i53FBkvCzuDmRbaMozTZoJBb1TToWhz3JfE",
        help="Comma separated list of destination addresses",
    )
    parser.add_argument(
        "--num-transactions",
        type=int,
        default=3,
        help="Number of batch transactions to send (default: 3)",
    )
    parser.add_argument(
        "--amount",
        type=int,
        default=1000,
        help="Amount in lamports to send per transfer (default: 1000)",
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

            destination_addresses = args.destinations.split(",")
            
            await send_many_batch_transactions(
                cdp, 
                sender_address, 
                destination_addresses, 
                args.num_transactions,
                args.amount
            )

        except Exception as error:
            print(f"Error in process: {error}")


if __name__ == "__main__":
    asyncio.run(main())
