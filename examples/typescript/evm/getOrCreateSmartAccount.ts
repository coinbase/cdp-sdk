// Usage: pnpm tsx evm/getOrCreateSmartAccount.ts

import { CdpClient } from "@coinbase/cdp-sdk";
import "dotenv/config";

const cdp = new CdpClient();

// First create an owner account
const owner = await cdp.evm.createAccount();
console.log("Created owner account:", owner.address);

// Get or create a smart account with the owner
// Note: Each owner can only have one smart account
const account = await cdp.evm.getOrCreateSmartAccount({ name: "MyAccount", owner });
console.log("EVM Smart Account Address:", account.address);

// Subsequent calls to getOrCreateSmartAccount with the same owner will return the existing account
const sameAccount = await cdp.evm.getOrCreateSmartAccount({ name: "MyAccount", owner });
console.log("Retrieved same account:", sameAccount.address);
console.log("Are accounts equal?", account.address === sameAccount.address); // Will be true

// To create multiple smart accounts, you need different owners
const anotherOwner = await cdp.evm.createAccount();
console.log("\nCreated another owner account:", anotherOwner.address);

const differentAccount = await cdp.evm.getOrCreateSmartAccount({ name: "DifferentAccount", owner: anotherOwner });
console.log("Different EVM Smart Account Address:", differentAccount.address);
