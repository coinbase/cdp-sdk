// Usage: pnpm tsx evm/smartAccount.update.ts

import { CdpClient } from "@coinbase/cdp-sdk";
import "dotenv/config";

const cdp = new CdpClient();

// Create a CDP account to use as the owner
const owner = await cdp.evm.createAccount();

// Create a smart account with the CDP account as owner
const smartAccount = await cdp.evm.getOrCreateSmartAccount({
    owner: owner,
    name: "my-smart-account"
});

console.log("Created smart account:", smartAccount.address);
console.log("Original name:", smartAccount.name);

// Update the smart account with a new name
const updatedSmartAccount = await cdp.evm.updateSmartAccount({
    address: smartAccount.address,
    owner: owner,
    update: {
        name: "updated-smart-account-name"
    }
});

console.log("Updated smart account:", updatedSmartAccount.address);
console.log("New name:", updatedSmartAccount.name);

// Verify the update by retrieving the smart account again
const retrievedSmartAccount = await cdp.evm.getSmartAccount({
    address: smartAccount.address,
    owner: owner
});

console.log("Retrieved smart account name:", retrievedSmartAccount.name);
