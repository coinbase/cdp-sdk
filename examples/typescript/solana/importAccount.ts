// Usage: pnpm tsx evm/importAccount.ts

import { CdpClient } from "@coinbase/cdp-sdk";
import "dotenv/config";
import { Keypair } from "@solana/web3.js";
import bs58 from 'bs58';

const cdp = new CdpClient();

// Importing account with 64-byte private key
console.log("--------------------------------");
console.log("Importing account with 64-byte private key...");
const keypair = Keypair.generate();
const privateKey = bs58.encode(keypair.secretKey); // secretKey is 64 bytes (32 bytes private + 32 bytes public)

const account = await cdp.solana.importAccount({
  privateKey: privateKey,
  name: "MyAccount",
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
  name: "MyAccount2",
});

console.log("Imported account (32-byte key):", secondAccount.address);

// Verify the imported key length
const keyBytes32 = bs58.decode(privateKey32);
console.log("Original private key length:", keyBytes32.length, "bytes");

console.log("--------------------------------");
console.log("Both accounts imported successfully!");
console.log("64-byte account address:", account.address);
console.log("32-byte account address:", secondAccount.address);