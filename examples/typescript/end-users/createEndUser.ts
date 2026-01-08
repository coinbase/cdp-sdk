// Usage: pnpm tsx end-users/createEndUser.ts

import { CdpClient } from "@coinbase/cdp-sdk";
import "dotenv/config";

const cdp = new CdpClient();

try {
    // Create an end user with an email authentication method with an EVM account.
    const endUser = await cdp.endUser.createEndUser({
        authenticationMethods: [
            { type: "email", email: "user@example.com" }
        ],
        evmAccount: { createSmartAccount: false }
    });

    console.log("Created end user:", endUser);
    
    // Create an end user with an email authentication method and a smart account.
    const endUserWithSmartAccount = await cdp.endUser.createEndUser({
        authenticationMethods: [
            { type: "email", email: "user+1@example.com" }
        ],
        evmAccount: { createSmartAccount: true }
    });

    console.log("Created end user with smart account:", endUserWithSmartAccount);

    // Create an end user with an email authentication method and a smart account with spend permissions.
    const endUserWithSmartAccountAndSpendPermissions = await cdp.endUser.createEndUser({
        authenticationMethods: [
            { type: "email", email: "user+2@example.com" }
        ],
        evmAccount: { createSmartAccount: true, enableSpendPermissions: true }
    });

    console.log("Created end user with smart account and spend permissions:", endUserWithSmartAccountAndSpendPermissions);
} catch (error) {
    console.error("Error creating end user: ", (error as { errorMessage: string }).errorMessage);
}
