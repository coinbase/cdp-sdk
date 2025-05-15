// Usage: pnpm tsx evm/importAccount.ts

import { CdpClient } from "@coinbase/cdp-sdk";
import "dotenv/config";
import { generatePrivateKey } from "viem/accounts";

const cdp = new CdpClient();
const account = await cdp.evm.importAccount({
  privateKey: generatePrivateKey(),
  name: "MyAccount",
});
console.log("Imported account: ", account.address);
