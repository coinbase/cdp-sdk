import asyncio
import base58
from cdp import CdpClient
from dotenv import load_dotenv
from solders.keypair import Keypair


async def main():
     async with CdpClient() as cdp:
        keypair = Keypair()
        
        # Import using base58 encoded private key
        print("1. Importing account using base58 encoded private key:")
        private_key_base58 = base58.b58encode(keypair.to_bytes()).decode('utf-8')
        print(f"Private key (base58): {private_key_base58}")
        
        account1 = await cdp.solana.import_account(
            private_key=private_key_base58,
        )
        print(f"Account imported successfully: {account1.address}\n")
        
        # Import using 32 byte private key array
        print("2. Importing account using 32 byte private key array:")
        new_keypair = Keypair()
        private_key_32_bytes = new_keypair.to_bytes()[:32]  # Take first 32 bytes (seed)
        print(f"Private key length: {len(private_key_32_bytes)} bytes")
        print(f"Private key (hex): {private_key_32_bytes.hex()}")
        
        account2 = await cdp.solana.import_account(
            private_key=private_key_32_bytes,
        )
        print(f"Account imported successfully: {account2.address}\n")
        
        # Verify all accounts have the same address (since they use the same private key for first 3)
        print("=== Verification ===")
        print(f"Account 1 address (base58 string): {account1.address}")
        print(f"Account 2 address (32-byte raw):   {account2.address}")
        
        if account1.address == account2.address:
            print("✓ First two accounts have the same address (as expected)")
        else:
            print("✗ Address mismatch detected")
            
asyncio.run(main())