// Usage: pnpm tsx solana/updateAccount.ts

import { CdpClient } from "@coinbase/cdp-sdk";

const cdp = new CdpClient();

const account = await cdp.solana.createAccount();
console.log("Created account: ", account.address);

const updatedAccount = await cdp.solana.updateAccount({
  address: account.address,
  update: {
    name: "New Name"
  }
});
console.log("Updated account:", JSON.stringify(updatedAccount, null, 2));
