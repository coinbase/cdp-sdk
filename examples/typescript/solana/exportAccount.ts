// Usage: pnpm tsx solana/exportAccount.ts

import { CdpClient } from "@coinbase/cdp-sdk";
import bs58 from "bs58";
import "dotenv/config";

const cdp = new CdpClient();

const account = await cdp.solana.getOrCreateAccount({
  name: "MyAccount",
});
console.log("Account:", account.address);

// Exporting account by address
console.log("--------------------------------");
console.log("Exporting account by address...");
const exportedPrivateKeyByAddress = await cdp.solana.exportAccount({
  address: account.address,
});
console.log("Exported private key:", exportedPrivateKeyByAddress);

// Verify public key (last 32 bytes are the public key)
const fullKeyBytesByAddress = bs58.decode(exportedPrivateKeyByAddress);
const publicKeyBytesByAddress = fullKeyBytesByAddress.subarray(32);
const derivedPublicKeyByAddress = bs58.encode(publicKeyBytesByAddress);
console.log("Public key derived from private key:", derivedPublicKeyByAddress);

// Exporting account by name
console.log("--------------------------------");
console.log("Exporting account by name...");
const exportedPrivateKeyByName = await cdp.solana.exportAccount({
  name: "MyAccount",
});
console.log("Exported private key:", exportedPrivateKeyByName);

// Verify public key (last 32 bytes are the public key)
const fullKeyBytesByName = bs58.decode(exportedPrivateKeyByName);
const publicKeyBytesByName = fullKeyBytesByName.subarray(32);
const derivedPublicKeyByName = bs58.encode(publicKeyBytesByName);
console.log("Public key derived from private key:", derivedPublicKeyByName);
