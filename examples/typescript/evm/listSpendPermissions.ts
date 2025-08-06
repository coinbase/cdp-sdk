// Usage: pnpm tsx evm/listSpendPermissions.ts

import { CdpClient } from "@coinbase/cdp-sdk";
import "dotenv/config";

const cdp = new CdpClient();

const smartAccount = await cdp.evm.getOrCreateSmartAccount({
  __experimental_enableSpendPermission: true,
  name: "Example-Account",
  owner: await cdp.evm.getOrCreateAccount({
    name: "Example-Account-Owner",
  }),
});

console.log("Smart Account Address:", smartAccount.address);

const permissions = await cdp.evm.listSpendPermissions({
  address: smartAccount.address,
});

console.log("All permissions granted by smart account:", smartAccount.address);
prettyPrint(permissions);

function prettyPrint(obj: object) {
  console.log(JSON.stringify(obj, null, 2));
}
