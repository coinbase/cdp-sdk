# Usage: uv run python solana/account.transfer.py

import asyncio
from cdp import CdpClient, SolanaTransferOptions
from dotenv import load_dotenv
from solana.rpc.api import Client as SolanaClient
from solders.pubkey import Pubkey as PublicKey

load_dotenv()


async def faucet_if_needed(cdp: CdpClient, address: str, amount: str):
    """Request faucet if needed and wait for funds."""
    connection = SolanaClient("https://api.devnet.solana.com")
    source_pubkey = PublicKey.from_string(address)

    # Check current balance
    balance_resp = connection.get_balance(source_pubkey)
    balance = balance_resp.value

    if balance == 0:
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

        amount = "0.0001"

        # Ensure account has funds
        await faucet_if_needed(cdp, sender.address, amount)

        # Perform transfer
        transfer = await sender.transfer(
            SolanaTransferOptions(
                to="3KzDtddx4i53FBkvCzuDmRbaMozTZoJBb1TToWhz3JfE",
                amount=amount,
                token="sol",
                network="devnet",
            )
        )

        print(
            f"Sent transaction with signature: {transfer.signature}. Waiting for confirmation..."
        )

        # Wait for confirmation
        confirmation = await sender.wait_for_transaction_confirmation(
            {"signature": transfer.signature, "network": "devnet"}
        )

        print(
            f"Transaction confirmed: Link: https://explorer.solana.com/tx/{confirmation.signature}?cluster=devnet"
        )


if __name__ == "__main__":
    asyncio.run(main())
