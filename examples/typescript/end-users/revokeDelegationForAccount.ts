// Usage: pnpm tsx end-users/revokeDelegationForAccount.ts <USER_UUID> <ADDRESS>

import { CdpClient } from "@coinbase/cdp-sdk";
import "dotenv/config";

const userId = process.argv[2];
const address = process.argv[3];

if (!userId || !address) {
  console.error(
    "Usage: pnpm tsx end-users/revokeDelegationForAccount.ts <USER_UUID> <ADDRESS>",
  );
  process.exit(1);
}

const cdp = new CdpClient();

try {
  // Revoke the account-scoped delegation via the client method
  await cdp.endUser.revokeDelegationForEndUserAccount({
    userId,
    address,
  });

  console.log("Revoked account-scoped delegation via client method");

  // Alternatively, use the EndUserAccount object shorthand
  const endUser = await cdp.endUser.getEndUser({ userId });

  await endUser.revokeDelegationForAccount({ address });

  console.log("Revoked account-scoped delegation via account method");
} catch (error) {
  console.error("Error: ", (error as { errorMessage: string }).errorMessage);
}
