// Usage: pnpm tsx end-users/getEndUser.ts

import { CdpClient } from "@coinbase/cdp-sdk";
import "dotenv/config";

const cdp = new CdpClient();

try {
    // First, create an end user to demonstrate the getEndUser method
    const createdEndUser = await cdp.endUser.createEndUser({
        authenticationMethods: [
            { type: "email", email: "user@example.com" }
        ],
        evmAccount: { createSmartAccount: false }
    });

    console.log("Created end user:", createdEndUser);
    console.log("User ID:", createdEndUser.userId);

    // Now retrieve the same end user using getEndUser
    const retrievedEndUser = await cdp.endUser.getEndUser({
        userId: createdEndUser.userId
    });

    console.log("\nRetrieved end user:", retrievedEndUser);
    console.log("User ID matches:", createdEndUser.userId === retrievedEndUser.userId);
} catch (error) {
    console.error("Error: ", (error as { errorMessage: string }).errorMessage);
}
