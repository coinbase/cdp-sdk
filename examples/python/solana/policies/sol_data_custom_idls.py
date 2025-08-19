# Usage: uv run python solana/policies/sol_data_custom_idls.py

import asyncio
import base64
import struct

from cdp.update_account_types import UpdateAccountOptions
from solders.keypair import Keypair
from solders.pubkey import Pubkey
from solders.system_program import ID as SYSTEM_PROGRAM_ID
from solders.transaction import Transaction
from solders.instruction import Instruction, AccountMeta
from solders.message import Message
from solders.hash import Hash

from cdp import CdpClient
from cdp.openapi_client.models.idl import Idl
from cdp.policies.types import (
    CreatePolicyOptions,
    SignSolanaTransactionRule,
    SolDataCriterion,
    SolDataCondition,
    SolDataParameterCondition,
)
from dotenv import load_dotenv

load_dotenv()

system_transfer_json={"address":"11111111111111111111111111111111","instructions":[{"name":"transfer","discriminator":[163,52,200,231,140,3,69,186],"args":[{"name":"lamports","type":"u64"}]}]}
system_transfer_idl = Idl(
    address=system_transfer_json["address"],
    instructions=system_transfer_json["instructions"],
)
token_transfer_json={"address":"TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA","instructions":[{"name":"transfer_checked","discriminator":[119,250,202,24,253,135,244,121],"args":[{"name":"amount","type":"u64"},{"name":"decimals","type":"u8"}]}]}
token_transfer_idl = Idl(
    address=token_transfer_json["address"],
    instructions=token_transfer_json["instructions"],
)
associated_token_program_json={"address":"ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL","instructions":[{"name":"create","discriminator":[24,30,200,40,5,28,7,119],"args":[]}]}
associated_token_program_idl = Idl(
    address=associated_token_program_json["address"],
    instructions=associated_token_program_json["instructions"],
)

async def main():
    """Create a Solana policy with solData criterion using known IDLs."""
    async with CdpClient() as cdp:
        create_options = CreatePolicyOptions(
            scope="account",
            description="Create solData account policy",
            rules=[
                SignSolanaTransactionRule(
                    action="accept",
                    operation="signSolTransaction",
                    criteria=[
                        SolDataCriterion(
                            type="solData",
                            idls=[system_transfer_idl, token_transfer_idl, associated_token_program_idl],
                            conditions=[
                                SolDataCondition(
                                    instruction="transfer",
                                    params=[
                                        SolDataParameterCondition(name="lamports", operator="<=", value="1000000"),
                                    ],
                                ),
                                SolDataCondition(
                                    instruction="transfer_checked",
                                    params=[
                                        SolDataParameterCondition(name="amount", operator="<=", value="100000"),
                                        SolDataParameterCondition(name="decimals", operator="==", value="6"),
                                    ],
                                ),
                                SolDataCondition(instruction="create"),
                            ],
                        )
                    ],
                )
            ],
        )
        
        policy = await cdp.policies.create_policy(policy=create_options)
        print(f"Created solData policy: {policy.id}")
        
        # Get or create the Solana account
        account_with_sol_data_policy = await cdp.solana.get_or_create_account(name="ZalDevDev1")

        # Update the account with the policy
        await cdp.solana.update_account(
            address=account_with_sol_data_policy.address,
            update=UpdateAccountOptions(account_policy=policy.id),
        )
        print(f"Updated account {account_with_sol_data_policy.address} with solData policy: {policy.id}")
        
        # Create a good transaction
        from_pubkey = Pubkey.from_string(account_with_sol_data_policy.address)
        good_transfer_amount = int(0.001 * 10**9)  # 0.001 SOL in lamports
        instructions = [
            create_anchor_system_transfer_instruction(good_transfer_amount),
            create_anchor_spl_transfer_checked_instruction(100000, 6),
            create_anchor_associated_token_account_create_instruction(),
        ]
        placeholder_blockhash = Hash.from_string("SysvarRecentB1ockHashes11111111111111111111")
        message = Message.new_with_blockhash(
            instructions,
            from_pubkey,
            placeholder_blockhash
        )
        transaction = Transaction.new_unsigned(message)
        
        serialized_transaction = bytes(transaction)
        base64_transaction = base64.b64encode(serialized_transaction).decode("utf-8")
        print(f"Base64 transaction: {base64_transaction}")
        
        try:
            result = await account_with_sol_data_policy.sign_transaction(transaction=base64_transaction)
            print(f"\n✅ Signed transaction: {result.signed_transaction}")
        except Exception as e:
            print(f"Error signing transaction: {e}")
        
        print("\n===============================================\n")
        
        # Test bad system transfer instruction
        print("Transaction with bad system transfer instruction:")
        bad_system_transfer_amount = int(0.002 * 10**9)  # 0.002 SOL in lamports
        instructions = [create_anchor_system_transfer_instruction(bad_system_transfer_amount)]
        placeholder_blockhash = Hash.from_string("SysvarRecentB1ockHashes11111111111111111111")
        message = Message.new_with_blockhash(
            instructions,
            from_pubkey,
            placeholder_blockhash
        )
        bad_transaction = Transaction.new_unsigned(message)
        
        bad_serialized_transaction = bytes(bad_transaction)
        bad_base64_transaction = base64.b64encode(bad_serialized_transaction).decode("utf-8")
        print(f"Bad base64 transaction: {bad_base64_transaction}")
        
        try:
            await account_with_sol_data_policy.sign_transaction(transaction=bad_base64_transaction)
        except Exception as error:
            print(f"Expected error while signing bad system transfer transaction: {error}")
        
        print("\n===============================================\n")
        
        # Test bad token transfer instruction
        print("Transaction with bad token transfer instruction:")
        bad_token_transfer_amount = 200000
        instructions = [create_anchor_spl_transfer_checked_instruction(bad_token_transfer_amount, 6)]
        placeholder_blockhash = Hash.from_string("SysvarRecentB1ockHashes11111111111111111111")
        message = Message.new_with_blockhash(
            instructions,
            from_pubkey,
            placeholder_blockhash
        )
        bad_token_transfer_transaction = Transaction.new_unsigned(message)
        
        bad_token_transfer_serialized_transaction = bytes(bad_token_transfer_transaction)
        bad_token_transfer_base64_transaction = base64.b64encode(bad_token_transfer_serialized_transaction).decode("utf-8")
        print(f"Bad token transfer base64 transaction: {bad_token_transfer_base64_transaction}")
        
        try:
            await account_with_sol_data_policy.sign_transaction(transaction=bad_token_transfer_base64_transaction)
        except Exception as error:
            print(f"Expected error while signing bad token transfer transaction: {error}")
        
        # Clean up
        print("Removing policy from account...")
        await cdp.solana.update_account(
            address=account_with_sol_data_policy.address,
            update=UpdateAccountOptions(account_policy=""),
        )
        
        print("Deleting policy...")
        await cdp.policies.delete_policy(id=policy.id)
        print(f"Policy deleted: {policy.id}")


def create_anchor_system_transfer_instruction(amount: int) -> Instruction:
    """Create an Anchor-formatted system transfer instruction.
    
    Args:
        amount: Amount in lamports to transfer
        
    Returns:
        Instruction for an Anchor-formatted system transfer
    """
    test_account = Keypair().pubkey()
    transfer_discriminator = bytes([163, 52, 200, 231, 140, 3, 69, 186])
    
    # Pack amount as little-endian u64
    lamports_buffer = struct.pack("<Q", amount)
    
    instruction_data = transfer_discriminator + lamports_buffer
    
    return Instruction(
        program_id=SYSTEM_PROGRAM_ID,
        data=instruction_data,
        accounts=[
            AccountMeta(pubkey=test_account, is_signer=True, is_writable=True),
            AccountMeta(pubkey=test_account, is_signer=False, is_writable=True),
        ],
    )


def create_anchor_spl_transfer_checked_instruction(amount: int, decimals: int) -> Instruction:
    """Create an Anchor-formatted token transfer_checked instruction.
    
    Args:
        amount: Amount of tokens to transfer
        decimals: Number of decimals for the token
        
    Returns:
        Instruction for an Anchor-formatted token transfer_checked
    """
    test_account = Keypair().pubkey()
    transfer_checked_discriminator = bytes([119, 250, 202, 24, 253, 135, 244, 121])
    
    # Serialize the arguments: amount (u64) + decimals (u8)
    amount_buffer = struct.pack("<Q", amount)
    decimals_buffer = struct.pack("<B", decimals)
    
    instruction_data = transfer_checked_discriminator + amount_buffer + decimals_buffer
    
    return Instruction(
        program_id=Pubkey.from_string("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
        data=instruction_data,
        accounts=[
            AccountMeta(pubkey=test_account, is_signer=False, is_writable=True),
            AccountMeta(pubkey=test_account, is_signer=False, is_writable=False),
            AccountMeta(pubkey=test_account, is_signer=False, is_writable=True),
            AccountMeta(pubkey=test_account, is_signer=True, is_writable=False),
        ],
    )


def create_anchor_associated_token_account_create_instruction() -> Instruction:
    """Create an Anchor-formatted associated token account create instruction."""
    test_account = Keypair().pubkey()
    create_discriminator = bytes([24, 30, 200, 40, 5, 28, 7, 119])
    
    instruction_data = create_discriminator
    
    return Instruction(
        program_id=Pubkey.from_string("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"),
        data=instruction_data,
        accounts=[
            AccountMeta(pubkey=test_account, is_signer=True, is_writable=True),
            AccountMeta(pubkey=test_account, is_signer=False, is_writable=True),
            AccountMeta(pubkey=test_account, is_signer=False, is_writable=False),
            AccountMeta(pubkey=test_account, is_signer=False, is_writable=False),
            AccountMeta(pubkey=test_account, is_signer=False, is_writable=False),
            AccountMeta(pubkey=test_account, is_signer=False, is_writable=False),
        ],
    )


asyncio.run(main())
