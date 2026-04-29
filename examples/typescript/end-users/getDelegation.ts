// Usage: pnpm tsx end-users/getDelegation.ts <USER_UUID>

import { CdpClient } from "@coinbase/cdp-sdk";
import "dotenv/config";

const userId = process.argv[2];
if (!userId) {
  console.error("Usage: pnpm tsx end-users/getDelegation.ts <USER_UUID>");
  process.exit(1);
}

const cdp = new CdpClient({
  basePath: process.env.CDP_BASE_PATH,
});

try {
  const delegation = await cdp.endUser.getDelegationForEndUser({
    userId,
  });

  console.log("Delegation:", delegation);
} catch (error) {
  console.error("Error: ", (error as { errorMessage: string }).errorMessage);
}
