import base64

from solana.rpc.api import Client as SolanaClient
from solders.hash import Hash
from solders.message import Message
from solders.pubkey import Pubkey as PublicKey
from solders.system_program import TransferParams, transfer as solders_transfer
from solders.transaction import Transaction
from spl.token.constants import TOKEN_PROGRAM_ID
from spl.token.instructions import (
    TransferCheckedParams,
    get_associated_token_address,
    transfer_checked,
)

from cdp.actions.solana.types import TransferOptions
from cdp.actions.solana.utils import (
    get_connected_network,
    get_or_create_connection,
    get_usdc_mint_address,
)
from cdp.api_clients import ApiClients
from cdp.openapi_client.models.send_solana_transaction_request import SendSolanaTransactionRequest


async def transfer(
    api_clients: ApiClients,
    options: TransferOptions,
) -> str:
    """Transfer an amount of a token from an account to another account.

    Args:
        api_clients: The API clients to use to send the transaction
        options: The options for the transfer

    Returns:
        The result of the transfer

    """
    connection = get_or_create_connection(options.network)
    connected_network = await get_connected_network(connection)

    if options.token == "sol":
        tx = await get_native_transfer(options.from_account, options.to_account, options.amount)
    else:
        mint_address = (
            get_usdc_mint_address(connected_network) if options.token == "usdc" else options.token
        )
        tx = get_spl_transfer(
            connection,
            options.from_account,
            options.to_account,
            mint_address,
            options.amount,
        )

    serialized_tx = base64.b64encode(bytes(tx)).decode("utf-8")
    response = await api_clients.solana_accounts.send_solana_transaction(
        send_solana_transaction_request=SendSolanaTransactionRequest(
            network="solana" if connected_network == "mainnet" else "solana-devnet",
            transaction=serialized_tx,
        ),
    )

    return response.transaction_signature


async def get_native_transfer(
    from_account: str,
    to_account: str,
    amount: int,
) -> Transaction:
    """Get the trasnaction bytes for a native transfer."""
    source_pubkey = PublicKey.from_string(from_account)
    dest_pubkey = PublicKey.from_string(to_account)

    transfer_params = TransferParams(
        from_pubkey=source_pubkey, to_pubkey=dest_pubkey, lamports=amount
    )
    transfer_instr = solders_transfer(transfer_params)

    placeholder_blockhash = Hash.from_string("SysvarRecentB1ockHashes11111111111111111111")
    message = Message.new_with_blockhash([transfer_instr], source_pubkey, placeholder_blockhash)
    tx = Transaction.new_unsigned(message)

    return tx


def get_spl_transfer(
    connection: SolanaClient,
    from_account: str,
    to_account: str,
    mint_address: str,
    amount: int,
) -> Transaction:
    """Get the transaction bytes for an SPL token transfer.

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

    source_ata = get_associated_token_address(from_pubkey, mint_pubkey)
    destination_ata = get_associated_token_address(to_pubkey, mint_pubkey)

    instructions = []

    try:
        balance = connection.get_token_account_balance(source_ata)

        if int(balance.value.amount) < amount:
            raise ValueError(
                f"Insufficient token balance. Have {balance.value.amount}, need {amount}"
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
            params=TransferCheckedParams(
                program_id=TOKEN_PROGRAM_ID,
                amount=amount,
                decimals=decimals,
                dest=destination_ata,
                owner=from_pubkey,
                source=source_ata,
                mint=mint_pubkey,
            ),
        )
    )
    placeholder_blockhash = Hash.from_string("SysvarRecentB1ockHashes11111111111111111111")
    message = Message.new_with_blockhash(instructions, from_pubkey, placeholder_blockhash)
    tx = Transaction.new_unsigned(message)

    return tx
