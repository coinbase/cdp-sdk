// Usage: pnpm tsx end-users/listEndUsers.ts

import { CdpClient } from "@coinbase/cdp-sdk";
import "dotenv/config";

const cdp = new CdpClient();

try {
    // List 10 end users sorted by creation date in descending order
    const sortedResult = await cdp.endUser.listEndUsers({
        pageSize: 10,
        sort: ["createdAt=desc"]
    });
    
    console.log(`Found ${sortedResult.endUsers.length} end users`);
    for (const endUser of sortedResult.endUsers) {
        console.log(`  - User ID: ${endUser.userId}`);
        console.log(`    Authentication Methods: ${JSON.stringify(endUser.authenticationMethods)}`);
        console.log(`    EVM Accounts: ${endUser.evmAccounts}`);
        console.log(`    EVM Smart Accounts: ${endUser.evmSmartAccounts}`);
        console.log(`    Solana Accounts: ${endUser.solanaAccounts}`);
        console.log();
    }
} catch (error) {
    console.error("Error listing end users: ", (error as { errorMessage: string }).errorMessage);
}

