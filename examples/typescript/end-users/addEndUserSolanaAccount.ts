// Usage: pnpm tsx end-users/addEndUserSolanaAccount.ts

import { CdpClient } from "@coinbase/cdp-sdk";
import "dotenv/config";

const cdp = new CdpClient();

try {
    // Create an end user with a Solana account.
    const endUser = await cdp.endUser.createEndUser({
        authenticationMethods: [
            { type: "email", email: "user@example.com" }
        ],
        solanaAccount: { createSmartAccount: false }
    });

    console.log("Created end user:", endUser.userId);
    console.log("Initial Solana accounts:", endUser.solanaAccountObjects);

    // Add another Solana account to the same end user.
    const result = await cdp.endUser.addEndUserSolanaAccount({
        userId: endUser.userId
    });

    console.log("Added Solana account:", result.solanaAccount.address);
    console.log("Account created at:", result.solanaAccount.createdAt);

    // Verify the end user now has two Solana accounts.
    const updatedEndUser = await cdp.endUser.getEndUser({
        userId: endUser.userId
    });

    console.log("Total Solana accounts:", updatedEndUser.solanaAccountObjects.length);
    console.log("Solana accounts:", updatedEndUser.solanaAccountObjects);
} catch (error) {
    console.error("Error:", (error as { errorMessage?: string }).errorMessage ?? error);
}
