# Usage: uv run python evm/evm_local_account.py

import asyncio

from cdp import CdpClient
from dotenv import load_dotenv
from cdp.evm_local_account import EvmLocalAccount
from eth_account.messages import encode_defunct

load_dotenv()


async def main():
    async with CdpClient() as cdp:
        account = await cdp.evm.get_or_create_account(name="MyServerAccount")
        print("Account: ", account)
        evm_local_account = EvmLocalAccount(account)
        print("Account compatible with eth_account: ", evm_local_account.address)
        
        print("\nSigning hash...")
        message_hash = "0x1234567890123456789012345678901234567890123456789012345678901234"
        signed_hash = await evm_local_account.unsafe_sign_hash(message_hash)
        print("Signed hash: ", signed_hash)
        
        print("\nSigning message...")
        message = "Hello, world!"
        signable_message = encode_defunct(text=message)
        signed_message = await evm_local_account.sign_message(signable_message)
        print("Signed message: ", signed_message)

        print("\nSigning transaction...")
        transaction = await account.sign_transaction(
            transaction_dict={
                "to": "0x000000000000000000000000000000000000dEaD",
                "value": 5000000000000000000,
                "chainId": 84532,
                "gas": 21000,
                "maxFeePerGas": 1000000000,
                "maxPriorityFeePerGas": 1000000000,
                "nonce": 0,
                "type": "0x2",
            }
        )
        print("Signed transaction: ", transaction)

        print("\nSigning typed data with domain, types, and message...")
        signed_typed_data = await evm_local_account.sign_typed_data(
            domain_data={
                "name": "MyDomain",
                "version": "1",
                "chainId": 1,
                "verifyingContract": "0x0000000000000000000000000000000000000000",
            },
            message_types={
                "EIP712Domain": [
                    {"name": "name", "type": "string"},
                    {"name": "version", "type": "string"},
                    {"name": "chainId", "type": "uint256"},
                    {"name": "verifyingContract", "type": "address"},
                ],
                "Person": [
                    {"name": "name", "type": "string"},
                    {"name": "wallet", "type": "address"},
                ],
            },
            message_data={
                "name": "John Doe",
                "wallet": "0x1234567890123456789012345678901234567890",
            },
        )
        print("Signed typed data for domain, types, and message: ", signed_typed_data)

        print("\nSigning typed data with full message...")
        typed_data = {
            "domain": {
                "name": "MyDomain",
                "version": "1",
                "chainId": 1,
                "verifyingContract": "0x0000000000000000000000000000000000000000",
            },
            "types": {
                "EIP712Domain": [
                    {"name": "name", "type": "string"},
                    {"name": "version", "type": "string"},
                    {"name": "chainId", "type": "uint256"},
                    {"name": "verifyingContract", "type": "address"},
                ],
                "Person": [
                    {"name": "name", "type": "string"},
                    {"name": "wallet", "type": "address"},
                ],
            },
            "primaryType": "Person",
            "message": {
                "name": "John Doe",
                "wallet": "0x1234567890123456789012345678901234567890",
            },
        }
        signed_typed_data = await evm_local_account.sign_typed_data(
            full_message=typed_data,
        )
        print("Signed typed data full message: ", signed_typed_data)


asyncio.run(main())
