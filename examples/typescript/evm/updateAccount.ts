// Usage: pnpm tsx evm/updateAccount.ts

import { CdpClient } from "@coinbase/cdp-sdk";

const cdp = new CdpClient();

const account = await cdp.evm.createAccount();
console.log("Created account: ", account.address);

const updatedAccount = await cdp.evm.updateAccount({
  address: account.address,
  update: {
    name: "New Name"
  }
});
console.log("Updated account:", JSON.stringify(updatedAccount, null, 2));
