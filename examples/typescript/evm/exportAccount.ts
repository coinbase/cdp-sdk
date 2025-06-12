// Usage: pnpm tsx evm/exportAccount.ts

import { CdpClient } from "@coinbase/cdp-sdk";
import "dotenv/config";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

const cdp = new CdpClient();

const privateKey = generatePrivateKey();
console.log("Generated private key:", privateKey);

const account = await cdp.evm.importAccount({
  privateKey,
  name: "MyImportedAccount",
});
console.log("Imported account:", account.address);

// Exporting account by address
console.log("--------------------------------");
console.log("Exporting account by address...");
const exportedPrivateKeyByAddress = await cdp.evm.exportAccount({
  address: account.address,
});
console.log("Exported private key:", exportedPrivateKeyByAddress);

const publicKeyByAddress = privateKeyToAccount(`0x${exportedPrivateKeyByAddress}`).address;
console.log("Public key derived from private key:", publicKeyByAddress);

// Exporting account by name
console.log("--------------------------------");
console.log("Exporting account by name...");
const exportedPrivateKeyByName = await cdp.evm.exportAccount({
  name: "MyImportedAccount",
});
console.log("Exported private key:", exportedPrivateKeyByName);

const publicKeyByName = privateKeyToAccount(`0x${exportedPrivateKeyByName}`).address;
console.log("Public key derived from private key:", publicKeyByName);
