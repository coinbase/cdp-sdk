# Usage: uv run python solana/account.transfer.py

import asyncio
from cdp import CdpClient
from dotenv import load_dotenv
from solana.constants import LAMPORTS_PER_SOL
from solana.rpc.api import Client as SolanaClient
from solders.pubkey import Pubkey as PublicKey

load_dotenv()

connection = SolanaClient("https://api.devnet.solana.com")


async def faucet_if_needed(cdp: CdpClient, address: str, amount: int):
    """Request faucet if needed and wait for funds."""
    if amount == 0:
        return

    source_pubkey = PublicKey.from_string(address)

    # Check current balance
    balance_resp = connection.get_balance(source_pubkey)
    balance = balance_resp.value

    if balance > 0:
        return balance

    print("Requesting funds from faucet...")
    await cdp.solana.request_faucet(address=address, token="sol")

    # Wait for funds
    max_attempts = 30
    attempts = 0
    while balance == 0 and attempts < max_attempts:
        balance_resp = connection.get_balance(source_pubkey)
        balance = balance_resp.value
        if balance == 0:
            print("Waiting for funds...")
            await asyncio.sleep(1)
            attempts += 1
        else:
            print(f"Account funded with {balance / 1e9} SOL")
            return balance

    if balance == 0:
        raise ValueError("Account not funded after multiple attempts")


async def main():
    async with CdpClient() as cdp:
        # Create or get sender account
        sender = await cdp.solana.get_or_create_account(name="Sender")

        amount = 0.0001 * LAMPORTS_PER_SOL

        # Ensure account has funds
        await faucet_if_needed(cdp, sender.address, amount)

        # Perform transfer
        signature = await sender.transfer(
            to="3KzDtddx4i53FBkvCzuDmRbaMozTZoJBb1TToWhz3JfE",
            amount=amount,
            token="sol",
            network="devnet",
        )

        print(
            f"Sent transaction with signature: {signature}. Waiting for confirmation..."
        )

        last_valid_block_height = connection.get_latest_blockhash()

        confirmation = connection.confirm_transaction(
            tx_sig=signature,
            last_valid_block_height=last_valid_block_height.value.last_valid_block_height,
            commitment="confirmed",
        )

        if confirmation.value[0].err:
            print(f"Something went wrong! Error: {confirmation.value.err.toString()}")
        else:
            print(
                f"Transaction confirmed! Link: https://explorer.solana.com/tx/{signature}?cluster=devnet"
            )


if __name__ == "__main__":
    asyncio.run(main())
