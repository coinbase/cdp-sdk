// Usage: pnpm tsx end-users/signSolanaMessage.ts <USER_UUID>
// Note: This example requires the end user to have an active delegation on their
// account that allows the developer to sign on their behalf.

import { CdpClient } from "@coinbase/cdp-sdk";
import "dotenv/config";

const userId = process.argv[2];
if (!userId) {
  console.error("Usage: pnpm tsx end-users/signSolanaMessage.ts <USER_UUID>");
  process.exit(1);
}

const cdp = new CdpClient();

try {
  const endUser = await cdp.endUser.getEndUser({ userId });

  console.log("Solana address:", endUser.solanaAccountObjects[0]?.address);

  // Sign a Solana message using the client method (developer calls on behalf of end user)
  const result = await cdp.endUser.signSolanaMessage({
    userId: endUser.userId,
    address: endUser.solanaAccountObjects[0].address,
    message: Buffer.from("Hello, World!").toString("base64"),
  });

  console.log("Signature (via client):", result.signature);

  // Alternatively, sign directly on the EndUserAccount (auto-picks first Solana address)
  const result2 = await endUser.signSolanaMessage({
    message: Buffer.from("Hello again!").toString("base64"),
  });

  console.log("Signature (via account):", result2.signature);
} catch (error) {
  console.error("Error: ", (error as { errorMessage: string }).errorMessage);
}
