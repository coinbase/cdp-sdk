// Usage: pnpm tsx end-users/revokeDelegation.ts <USER_UUID>

import { CdpClient } from "@coinbase/cdp-sdk";
import "dotenv/config";

const userId = process.argv[2];
if (!userId) {
  console.error("Usage: pnpm tsx end-users/revokeDelegation.ts <USER_UUID>");
  process.exit(1);
}

const cdp = new CdpClient();

try {
  const endUser = await cdp.endUser.getEndUser({ userId });

  // Revoke all active delegations for the end user using the client method
  await cdp.endUser.revokeDelegationForEndUser({
    userId: endUser.userId,
  });

  console.log("Revoked delegation for end user via client method");

  // Alternatively, revoke delegation directly on the EndUserAccount object
  await endUser.revokeDelegation();

  console.log("Revoked delegation for end user via account method");
} catch (error) {
  console.error("Error: ", (error as { errorMessage: string }).errorMessage);
}
