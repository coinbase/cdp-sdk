// Usage: pnpm tsx evm/importAccount.ts

import { CdpClient } from "@coinbase/cdp-sdk";
import "dotenv/config";

const cdp = new CdpClient();
const account = await cdp.evm.importAccount({
    privateKey: "0x123456",
    name: "MyAccount"
});
console.log("Imported account: ", account.address);
