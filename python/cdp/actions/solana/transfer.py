import base64

from solana.rpc.api import Client as SolanaClient
from solana.rpc.types import TxOpts
from solders.message import Message
from solders.pubkey import Pubkey as PublicKey
from solders.system_program import TransferParams, transfer as solders_transfer
from spl.token.constants import TOKEN_PROGRAM_ID
from spl.token.core import Account
from spl.token.instructions import get_associated_token_address, transfer_checked

from cdp.actions.solana.types import TransferOptions, TransferResult
from cdp.actions.solana.utils import Network, get_or_create_connection
from cdp.api_clients import ApiClients


async def transfer(
    api_clients: ApiClients,
    options: TransferOptions,
) -> TransferResult:
    """Transfer an amount of a token from an account to another account.

    Args:
        api_clients: The API clients to use to send the transaction
        options: The options for the transfer

    Returns:
        The result of the transfer

    """
    connection = get_or_create_connection(options.network)

    if options.token == "sol":
        tx_bytes = get_native_transfer_instructions(
            connection, options.from_account, options.to_account, options.amount
        )
    else:
        mint_address = (
            get_usdc_mint_address(options.network)
            if options.token == "usdc"
            else options.mint_address
        )
        tx_bytes = get_spl_transfer_instructions(
            connection,
            options.from_account,
            options.to_account,
            mint_address,
            options.amount,
        )

    serialized_tx = base64.b64encode(tx_bytes).decode("utf-8")
    response = await api_clients.solana.sign_transaction(
        options.from_account, transaction=serialized_tx
    )
    signed_tx = response.signed_transaction
    decoded_signed_tx = base64.b64decode(signed_tx)

    tx_resp = connection.send_raw_transaction(
        decoded_signed_tx, opts=TxOpts(skip_preflight=False, preflight_commitment="processed")
    )

    return TransferResult(signature=tx_resp.signature)


async def get_native_transfer_instructions(
    connection: SolanaClient,
    from_account: str,
    to_account: str,
    amount: int,
) -> bytes:
    """Get the instructions for a native transfer."""
    source_pubkey = PublicKey.from_string(from_account)
    dest_pubkey = PublicKey.from_string(to_account)

    blockhash_resp = connection.get_latest_blockhash()
    blockhash = blockhash_resp.value.blockhash

    transfer_params = TransferParams(
        from_pubkey=source_pubkey, to_pubkey=dest_pubkey, lamports=amount
    )
    transfer_instr = solders_transfer(transfer_params)

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

    return tx_bytes


def get_spl_transfer_instructions(
    connection: SolanaClient,
    from_account: str,
    to_account: str,
    mint_address: str,
    amount: int,
) -> bytes:
    """Get the instructions for an SPL token transfer.

    Args:
        connection: The Solana client connection
        from_account: The source account public key
        to_account: The destination account public key
        mint_address: The token mint address
        amount: The amount to transfer

    Returns:
        The transaction bytes

    """
    from_pubkey = PublicKey.from_string(from_account)
    to_pubkey = PublicKey.from_string(to_account)
    mint_pubkey = PublicKey.from_string(mint_address)

    try:
        mint_info = connection.get_account_info(mint_pubkey)
        if not mint_info:
            raise ValueError(f"Failed to fetch mint info for mint address {mint_address}")
    except Exception as e:
        raise ValueError(
            f"Failed to fetch mint info for mint address {mint_address}. Error: {e!s}"
        ) from e

    # Get the decimals from the mint info
    decimals = mint_info.value.data[
        44
    ]  # The decimals are stored at offset 44 in the mint account data
    adjusted_amount = int(amount * (10**decimals))

    source_ata = get_associated_token_address(from_pubkey, mint_pubkey)
    destination_ata = get_associated_token_address(to_pubkey, mint_pubkey)

    instructions = []

    try:
        source_account = connection.get_account_info(source_ata)
        if not source_account:
            raise ValueError(f"Source token account not found: {source_ata}")

        source_token_account = Account.unpack(source_account.value.data)
        if source_token_account.amount < adjusted_amount:
            raise ValueError(
                f"Insufficient token balance. Have {source_token_account.amount}, need {adjusted_amount}"
            )
    except Exception as e:
        raise ValueError(f"Error checking source account: {e!s}") from e

    # Check if destination account exists, if not create it
    try:
        dest_account = connection.get_account_info(destination_ata)
        if not dest_account:
            from spl.token.instructions import create_associated_token_account

            instructions.append(
                create_associated_token_account(
                    payer=from_pubkey, owner=to_pubkey, mint=mint_pubkey
                )
            )
    except Exception as e:
        raise ValueError(f"Error checking destination account: {e!s}") from e

    instructions.append(
        transfer_checked(
            program_id=TOKEN_PROGRAM_ID,
            source=source_ata,
            mint=mint_pubkey,
            dest=destination_ata,
            owner=from_pubkey,
            amount=adjusted_amount,
            decimals=decimals,
            signers=[],
        )
    )

    blockhash_resp = connection.get_latest_blockhash()
    blockhash = blockhash_resp.value.blockhash

    message = Message.new_with_blockhash(
        instructions,
        from_pubkey,
        blockhash,
    )

    # Create transaction bytes
    sig_count = bytes([1])  # 1 byte for signature count (1)
    empty_sig = bytes([0] * 64)  # 64 bytes of zeros for the empty signature
    message_bytes = bytes(message)  # Get the serialized message bytes

    # Concatenate to form the transaction bytes
    tx_bytes = sig_count + empty_sig + message_bytes

    return tx_bytes


USDC_MAINNET_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
USDC_DEVNET_MINT = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"


def get_usdc_mint_address(network: Network) -> str:
    """Get the USDC mint address for the given connection."""
    return USDC_MAINNET_MINT if network == Network.MAINNET else USDC_DEVNET_MINT
