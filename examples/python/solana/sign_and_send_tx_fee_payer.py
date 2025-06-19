import asyncio
import base64
from decimal import Decimal

from solders.pubkey import Pubkey as PublicKey
from solders.system_program import TransferParams, transfer
from solders.message import Message
from solana.rpc.api import Client as SolanaClient
from solana.rpc.types import TxOpts

from cdp import CdpClient

async def main(source_address: str = None):
    """Main function to demonstrate sending SOL with a fee payer."""
    cdp = CdpClient()

    try:
        # Required: Destination address to send SOL to
        destination_address = "3KzDtddx4i53FBkvCzuDmRbaMozTZoJBb1TToWhz3JfE"

        # Amount of lamports to send (default: 1000 = 0.000001 SOL)
        lamports_to_send = 1000

        connection = SolanaClient("https://api.devnet.solana.com")

        # Create or get fee payer account
        fee_payer = await cdp.solana.get_or_create_account(
            name="test-sol-account-relayer"
        )
        print(f"Fee payer address: {fee_payer.address}")

        # Request funds on the feePayer address
        await request_faucet_and_wait_for_balance(cdp, fee_payer.address, connection)

        # Get or create funding account
        if source_address:
            from_address = source_address
            print(f"Using existing SOL account: {from_address}")
        else:
            account = await cdp.solana.get_or_create_account(
                name="test-sol-account"
            )
            from_address = account.address
            print(f"Successfully created new SOL account: {from_address}")

            # Request funds to send on the from address
            await request_faucet_and_wait_for_balance(cdp, from_address, connection)

        # Check initial balance
        initial_from_balance = connection.get_balance(PublicKey.from_string(from_address)).value
        if initial_from_balance < lamports_to_send:
            raise Exception(
                f"Insufficient balance: {initial_from_balance} lamports, need at least {lamports_to_send} lamports"
            )

        # Create transaction
        source_pubkey = PublicKey.from_string(from_address)
        dest_pubkey = PublicKey.from_string(destination_address)
        fee_payer_pubkey = PublicKey.from_string(fee_payer.address)

        # Get latest blockhash
        blockhash_resp = connection.get_latest_blockhash()
        blockhash = blockhash_resp.value.blockhash

        # Create transfer instruction
        transfer_params = TransferParams(
            from_pubkey=source_pubkey,
            to_pubkey=dest_pubkey,
            lamports=lamports_to_send
        )
        transfer_instr = transfer(transfer_params)

        # Create message
        message = Message.new_with_blockhash(
            [transfer_instr],
            fee_payer_pubkey,  # Set fee payer
            blockhash,
        )

        # Get initial balances before transaction
        initial_fee_payer_balance = connection.get_balance(fee_payer_pubkey).value

        # Create a transaction envelope with signature space
        sig_count = bytes([2])  # 2 bytes for signature count (2 signatures needed)
        empty_sig = bytes([0] * 128)  # 128 bytes of zeros for the empty signatures (2 * 64)
        message_bytes = bytes(message)  # Get the serialized message bytes

        # Concatenate to form the transaction bytes
        tx_bytes = sig_count + empty_sig + message_bytes

        # Encode to base64 used by CDP API
        serialized_tx = base64.b64encode(tx_bytes).decode("utf-8")

        # Sign with the funding account
        signed_tx_response = await cdp.solana.sign_transaction(
            address=from_address,
            transaction=serialized_tx
        )

        # Sign with fee payer address
        final_signed_tx_response = await cdp.solana.sign_transaction(
            address=fee_payer.address,
            transaction=signed_tx_response.signed_transaction
        )

        # Send the signed transaction to the network
        send_response = connection.send_raw_transaction(
            base64.b64decode(final_signed_tx_response.signed_transaction),
            opts=TxOpts(skip_preflight=False, preflight_commitment="processed")
        )
        signature = send_response.value

        # Wait for confirmation
        confirmation = connection.confirm_transaction(
            signature,
            commitment="processed"
        )

        if hasattr(confirmation, "err") and confirmation.err:
            raise Exception(f"Transaction failed: {confirmation.err}")

        print("Transaction confirmed:", "failed" if hasattr(confirmation, "err") and confirmation.err else "success")
        print(f"Transaction explorer link: https://explorer.solana.com/tx/{signature}?cluster=devnet")

        return {
            "from_address": from_address,
            "destination_address": destination_address,
            "amount": lamports_to_send / 1e9,
            "signature": signature,
            "success": not (hasattr(confirmation, "err") and confirmation.err),
        }

    except Exception as error:
        print("Error processing SOL transaction:", error)
        raise error
    finally:
        # Clean up the CDP client session
        await cdp.close()

async def request_faucet_and_wait_for_balance(cdp, address, connection, token="sol"):
    """Request funds from the faucet and wait for the balance to be available."""
    # Request funds from faucet
    faucet_resp = await cdp.solana.request_faucet(
        address=address,
        token=token
    )
    print(f"Successfully requested {token.upper()} from faucet:", faucet_resp)

    # Wait until the address has balance
    balance = 0
    attempts = 0
    max_attempts = 30

    while balance == 0 and attempts < max_attempts:
        balance = connection.get_balance(PublicKey.from_string(address)).value
        if balance == 0:
            print("Waiting for funds...")
            await asyncio.sleep(1)
            attempts += 1

    if balance == 0:
        raise Exception("Account not funded after multiple attempts")

    print("Account funded with", balance / 1e9, "SOL")
    return

if __name__ == "__main__":
    import sys
    source_address = sys.argv[1] if len(sys.argv) > 1 else None
    asyncio.run(main(source_address))