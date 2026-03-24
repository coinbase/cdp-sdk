// Usage: pnpm tsx solana/accounts/importAccount.ts

import { CdpClient } from "@coinbase/cdp-sdk";
import "dotenv/config";
import bs58 from "bs58";

const cdp = new CdpClient();

/**
 * Generates an Ed25519 key pair with extractable private key bytes.
 * Node.js doesn't support exportKey("raw") for Ed25519 private keys;
 * we export as JWK and decode the "d" field (base64url-encoded raw private key).
 */
async function generateExtractableKeyPair(): Promise<{
  privateKeyBytes: Uint8Array;
  publicKeyBytes: Uint8Array;
}> {
  const keyPair = (await crypto.subtle.generateKey("Ed25519", true, [
    "sign",
    "verify",
  ])) as CryptoKeyPair;
  const jwk = await crypto.subtle.exportKey("jwk", keyPair.privateKey);
  const privateKeyBytes = Buffer.from(jwk.d!, "base64url");
  const publicKeyBytes = new Uint8Array(
    await crypto.subtle.exportKey("raw", keyPair.publicKey),
  );
  return { privateKeyBytes, publicKeyBytes };
}

// Importing account with base58 encoded private key (64 bytes)
console.log("--------------------------------");
console.log("Importing account with 64-byte private key...");
const { privateKeyBytes, publicKeyBytes } = await generateExtractableKeyPair();
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
const { privateKeyBytes: privateKeyBytes32 } = await generateExtractableKeyPair();

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
