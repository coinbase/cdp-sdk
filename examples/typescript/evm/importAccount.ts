// Usage: pnpm tsx evm/importAccount.ts

import { CdpClient } from "@coinbase/cdp-sdk";
import "dotenv/config";

const cdp = new CdpClient();
const account = await cdp.evm.importAccount({
    privateKey: "<hex-encoded-private-key>",
});
console.log("Imported account: ", account.address);
