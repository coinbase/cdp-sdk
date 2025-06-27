import asyncio
import base58
from cdp import CdpClient
from dotenv import load_dotenv
from solders.keypair import Keypair


async def main():
     async with CdpClient() as cdp:
        # Generate a keypair for our examples
        keypair = Keypair()
        
        # Example 1: Import using base58 string (original method)
        print("1. Importing account using base58 string:")
        private_key_base58 = base58.b58encode(keypair.to_bytes()).decode('utf-8')
        print(f"   Private key (base58): {private_key_base58}")
        
        account1 = await cdp.solana.import_account(
            private_key=private_key_base58,
        )
        print(f"   ✓ Account imported successfully: {account1.address}\n")
        
        # Example 2: Import using raw bytes (64-byte format)
        print("2. Importing account using raw bytes (64-byte format):")
        new_keypair = Keypair()
        private_key_64_bytes = new_keypair.to_bytes()
        print(f"   Private key length: {len(private_key_64_bytes)} bytes")
        print(f"   Private key (hex): {private_key_64_bytes.hex()}")
        
        account2 = await cdp.solana.import_account(
            private_key=private_key_64_bytes,
        )
        print(f"   ✓ Account imported successfully: {account2.address}\n")
        
        # Example 3: Import using raw bytes (32-byte format - seed only)
        print("3. Importing account using raw bytes (32-byte format):")
        new_keypair = Keypair()
        private_key_32_bytes = new_keypair.to_bytes()[:32]  # Take first 32 bytes (seed)
        print(f"   Private key length: {len(private_key_32_bytes)} bytes")
        print(f"   Private key (hex): {private_key_32_bytes.hex()}")
        
        account3 = await cdp.solana.import_account(
            private_key=private_key_32_bytes,
        )
        print(f"   ✓ Account imported successfully: {account3.address}\n")
        
        # Example 4: Create a new keypair and import using bytes directly
        print("4. Creating new keypair and importing using bytes:")
        new_keypair = Keypair()
        new_private_key_bytes = new_keypair.to_bytes()
        print(f"   New keypair generated")
        print(f"   Private key length: {len(new_private_key_bytes)} bytes")
        
        account4 = await cdp.solana.import_account(
            private_key=new_private_key_bytes,
        )
        print(f"   ✓ New account imported successfully: {account4.address}\n")
        
        # Verify all accounts have the same address (since they use the same private key for first 3)
        print("=== Verification ===")
        print(f"Account 1 address (base58 string): {account1.address}")
        print(f"Account 2 address (64-byte raw):   {account2.address}")
        print(f"Account 3 address (32-byte raw):   {account3.address}")
        print(f"Account 4 address (new keypair):   {account4.address}")
        
        if account1.address == account2.address == account3.address:
            print("✓ First three accounts have the same address (as expected)")
        else:
            print("✗ Address mismatch detected")
            
        print(f"✓ New account has different address: {account4.address != account1.address}")


asyncio.run(main())