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
} catch (error) {
    console.error("Error creating end user: ", (error as { errorMessage: string }).errorMessage);
}
