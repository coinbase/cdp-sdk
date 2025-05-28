import asyncio
import base64

from cdp import CdpClient
from solana.rpc.api import Client as SolanaClient
from solders.message import Message
from solders.pubkey import Pubkey as PublicKey
from solders.system_program import TransferParams, transfer
from dotenv import load_dotenv

load_dotenv()


async def main():
    async with CdpClient() as cdp:
        account = await cdp.solana.create_account()
        response = await account.sign_transaction(
            transaction=get_transaction(account.address)
        )
        print(response)


def get_transaction(address: str):
    connection = SolanaClient("https://api.devnet.solana.com")

    source_pubkey = PublicKey.from_string(address)
    dest_pubkey = PublicKey.from_string("3KzDtddx4i53FBkvCzuDmRbaMozTZoJBb1TToWhz3JfE")

    blockhash_resp = connection.get_latest_blockhash()
    blockhash = blockhash_resp.value.blockhash

    transfer_params = TransferParams(
        from_pubkey=source_pubkey, to_pubkey=dest_pubkey, lamports=1000
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

    return serialized_tx


asyncio.run(main())
