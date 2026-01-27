// Usage: pnpm tsx end-users/addEndUserEvmSmartAccount.ts

import { CdpClient } from "@coinbase/cdp-sdk";
import "dotenv/config";

const cdp = new CdpClient();

try {
    // Create an end user with an EVM  smart account.
    const endUser = await cdp.endUser.createEndUser({
        authenticationMethods: [
            { type: "email", email: "user@example.com" }
        ],
        evmAccount: { createSmartAccount: true, enableSpendPermissions: true }
    });

    console.log("Created end user:", endUser.userId);
    console.log("Initial EVM accounts:", endUser.evmAccountObjects);
    console.log("Initial EVM smart accounts:", endUser.evmSmartAccountObjects);

    // Add another EVM smart account to the same end user.
    const result = await cdp.endUser.addEndUserEvmSmartAccount({
        userId: endUser.userId,
        enableSpendPermissions: true
    });

    console.log("Added EVM smart account:", result.evmSmartAccount.address);
    console.log("Owner addresses:", result.evmSmartAccount.ownerAddresses);
    console.log("Account created at:", result.evmSmartAccount.createdAt);

    // Verify the end user now has two EVM smart accounts.
    const updatedEndUser = await cdp.endUser.getEndUser({
        userId: endUser.userId
    });

    console.log("Total EVM smart accounts:", updatedEndUser.evmSmartAccountObjects.length);
    console.log("EVM smart accounts:", updatedEndUser.evmSmartAccountObjects);
} catch (error) {
    console.error("Error:", (error as { errorMessage?: string }).errorMessage ?? error);
}
