// Usage: pnpm tsx solana/exportAccount.ts

import { CdpClient } from "@coinbase/cdp-sdk";
import { Keypair } from "@solana/web3.js";
import "dotenv/config";

const cdp = new CdpClient();

const account = await cdp.solana.createAccount({
  name: "MyAccount",
});
console.log("Account: ", account.address);

// Exporting account by address
console.log("--------------------------------");
console.log("Exporting account by address...");
const exportedPrivateKeyByAddress = await cdp.solana.exportAccount({
  address: account.address,
});
console.log("Exported private key: ", exportedPrivateKeyByAddress);

const keypairByAddress = Keypair.fromSecretKey(Buffer.from(exportedPrivateKeyByAddress, "base64"));
const publicKeyByAddress = keypairByAddress.publicKey.toBase58();
console.log("Public key derived from private key:", publicKeyByAddress);

// Exporting account by name
console.log("--------------------------------");
console.log("Exporting account by name...");
const exportedPrivateKeyByName = await cdp.solana.exportAccount({
  name: "MyAccount",
});
console.log("Exported private key: ", exportedPrivateKeyByName);

const keypairByName = Keypair.fromSecretKey(Buffer.from(exportedPrivateKeyByName, "base64"));
const publicKeyByName = keypairByName.publicKey.toBase58();
console.log("Public key derived from private key:", publicKeyByName);
