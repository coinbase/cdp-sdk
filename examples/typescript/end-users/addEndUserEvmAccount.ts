// Usage: pnpm tsx end-users/addEndUserEvmAccount.ts

import { CdpClient } from "@coinbase/cdp-sdk";
import "dotenv/config";

const cdp = new CdpClient();

try {
    // Create an end user with an initial EVM account.
    const endUser = await cdp.endUser.createEndUser({
        authenticationMethods: [
            { type: "email", email: "user@example.com" }
        ],
        evmAccount: { createSmartAccount: false }
    });

    console.log("Created end user:", endUser.userId);
    console.log("Initial EVM accounts:", endUser.evmAccountObjects);

    // Add a new EVM account to the same end user.
    const result = await cdp.endUser.addEndUserEvmAccount({
        userId: endUser.userId
    });

    console.log("Added new EVM account:", result.evmAccount.address);
    console.log("Account created at:", result.evmAccount.createdAt);

    // Verify the end user now has two EVM accounts.
    const updatedEndUser = await cdp.endUser.getEndUser({
        userId: endUser.userId
    });

    console.log("Updated EVM accounts:", updatedEndUser.evmAccountObjects);
    console.log("Total EVM accounts:", updatedEndUser.evmAccountObjects.length);
} catch (error) {
    console.error("Error:", (error as { errorMessage?: string }).errorMessage ?? error);
}
