// Usage: pnpm tsx solana/accounts/importAccount.ts

import { CdpClient } from "@coinbase/cdp-sdk";
import "dotenv/config";
import { generateKeyPair } from "@solana/kit";
import bs58 from "bs58";

const cdp = new CdpClient();

// Importing account with base58 encoded private key (64 bytes)
console.log("--------------------------------");
console.log("Importing account with 64-byte private key...");
const keyPair = await generateKeyPair();
const privateKeyBytes = new Uint8Array(
  await crypto.subtle.exportKey("raw", keyPair.privateKey),
);
const publicKeyBytes = new Uint8Array(
  await crypto.subtle.exportKey("raw", keyPair.publicKey),
);
const secretKey = new Uint8Array(64);
secretKey.set(privateKeyBytes);
secretKey.set(publicKeyBytes, 32);
const privateKey = bs58.encode(secretKey); // secretKey is 64 bytes (32 bytes private + 32 bytes public)

const account = await cdp.solana.importAccount({
  privateKey: privateKey, // e.g. "3MLZ...Uko8zz"
});

console.log("Imported account (64-byte key):", account.address);

// Verify the imported key length
const keyBytes64 = bs58.decode(privateKey);
console.log("Original private key length:", keyBytes64.length, "bytes");

// Importing account with 32-byte array private key
console.log("--------------------------------");
console.log("Importing account with raw bytes directly (32-byte)...");
const secondKeyPair = await generateKeyPair();
const privateKeyBytes32 = new Uint8Array(
  await crypto.subtle.exportKey("raw", secondKeyPair.privateKey),
);

const secondAccount = await cdp.solana.importAccount({
  privateKey: privateKeyBytes32, // Using raw bytes directly instead of base58 string
  name: "BytesAccount32",
});

console.log("Imported account (raw 32-byte):", secondAccount.address);
console.log("Raw private key length:", privateKeyBytes32.length, "bytes");

console.log("--------------------------------");
console.log("All accounts imported successfully!");
console.log("64-byte string account address:", account.address);
console.log("32-byte bytes account address:", secondAccount.address);
