// Usage: pnpm tsx evm/importAccount.ts

import { CdpClient } from "@coinbase/cdp-sdk";
import "dotenv/config";
import { Keypair } from "@solana/web3.js";
import bs58 from 'bs58';

const cdp = new CdpClient({
  apiKeyId: "557730ea-e613-4072-a111-7cd26bcd75a7",
  apiKeySecret: "/b0ignBsNZ6UQshvmQXyG0SejTZ8+WCzQfaRzkSVi9NociYj2a/Ctr9bG7SpDL7nLN3yPHIRb9tW3qJmCd08ig==",
  walletSecret: "MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQgJeO0FLp3FJRFvPUflelGZL7m94gd7jTrua6pMTD/pq+hRANCAATtJxSQNIZUn6c95KK1dsqLWwhKuuv8PT/kHm6HUnli7AQC8V7dTaVYpQWCMY+mcHrjE0zkn1JBdMAOdkM3+Y2C",
  basePath: "https://cloud-api-dev.cbhq.net/platform",
  debugging: true,
});

// Importing account with 64-byte private key
console.log("--------------------------------");
console.log("Importing account with 64-byte private key...");
const keypair = Keypair.generate();
const privateKey = bs58.encode(keypair.secretKey); // secretKey is 64 bytes (32 bytes private + 32 bytes public)

const account = await cdp.solana.importAccount({
  privateKey: privateKey,
});

console.log("Imported account (64-byte key):", account.address);

// Verify the imported key length
const keyBytes64 = bs58.decode(privateKey);
console.log("Original private key length:", keyBytes64.length, "bytes");

// Importing account with 32-byte private key
console.log("--------------------------------");
console.log("Importing account with 32-byte private key...");
const secondKeypair = Keypair.generate();
const privateKey32 = bs58.encode(secondKeypair.secretKey.subarray(0, 32)); // Take only first 32 bytes (private key only)

const secondAccount = await cdp.solana.importAccount({
  privateKey: privateKey32,
});

console.log("Imported account (32-byte key):", secondAccount.address);

// Verify the imported key length
const keyBytes32 = bs58.decode(privateKey32);
console.log("Original private key length:", keyBytes32.length, "bytes");

console.log("--------------------------------");
console.log("Importing account with raw bytes directly (64-byte)...");
const thirdKeypair = Keypair.generate();
const privateKeyBytes64 = thirdKeypair.secretKey; // This is already a Uint8Array with 64 bytes

const thirdAccount = await cdp.solana.importAccount({
  privateKey: privateKeyBytes64, // Using raw bytes directly instead of base58 string
  name: "BytesAccount64",
});

console.log("Imported account (raw 64-byte):", thirdAccount.address);
console.log("Raw private key length:", privateKeyBytes64.length, "bytes");

// NEW: Importing account with raw bytes directly (32-byte)
console.log("--------------------------------");
console.log("Importing account with raw bytes directly (32-byte)...");
const fourthKeypair = Keypair.generate();
const privateKeyBytes32 = fourthKeypair.secretKey.subarray(0, 32); // Take only first 32 bytes as Uint8Array

const fourthAccount = await cdp.solana.importAccount({
  privateKey: privateKeyBytes32, // Using raw bytes directly instead of base58 string
  name: "BytesAccount32",
});

console.log("Imported account (raw 32-byte):", fourthAccount.address);
console.log("Raw private key length:", privateKeyBytes32.length, "bytes");

console.log("--------------------------------");
console.log("All accounts imported successfully!");
console.log("64-byte string account address:", account.address);
console.log("32-byte string account address:", secondAccount.address);
console.log("64-byte bytes account address:", thirdAccount.address);
console.log("32-byte bytes account address:", fourthAccount.address);