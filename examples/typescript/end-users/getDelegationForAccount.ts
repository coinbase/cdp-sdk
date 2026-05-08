// Usage: pnpm tsx end-users/getDelegationForAccount.ts <USER_UUID> <ADDRESS>

import { CdpClient } from "@coinbase/cdp-sdk";
import "dotenv/config";

const userId = process.argv[2];
const address = process.argv[3];

if (!userId || !address) {
  console.error(
    "Usage: pnpm tsx end-users/getDelegationForAccount.ts <USER_UUID> <ADDRESS>",
  );
  process.exit(1);
}

const cdp = new CdpClient({
  basePath: process.env.CDP_BASE_PATH,
});

try {
  // Get the account-scoped delegation via the client method
  const delegation = await cdp.endUser.getDelegationForEndUserAccount({
    userId,
    address,
  });

  console.log("Account-scoped delegation via client method:", delegation);

  // Alternatively, use the EndUserAccount object shorthand
  const endUser = await cdp.endUser.getEndUser({ userId });

  const delegation2 = await endUser.getDelegationForAccount({ address });

  console.log("Account-scoped delegation via account method:", delegation2);
} catch (error) {
  console.error("Error: ", (error as { errorMessage: string }).errorMessage);
}
