// Usage: pnpm tsx end-users/signEvmHash.ts <USER_UUID>
// Note: This example requires the end user to have an active delegation on their
// account that allows the developer to sign on their behalf.

import { CdpClient } from "@coinbase/cdp-sdk";
import "dotenv/config";

const userId = process.argv[2];
if (!userId) {
  console.error("Usage: pnpm tsx end-users/signEvmHash.ts <USER_UUID>");
  process.exit(1);
}

const cdp = new CdpClient();

try {
  const endUser = await cdp.endUser.getEndUser({ userId });

  console.log("EVM address:", endUser.evmAccountObjects[0]?.address);

// Sign an EVM hash using the client method (developer calls on behalf of end user)
  const result = await cdp.endUser.signEvmHash({
    userId: endUser.userId,
    hash: "0x0000000000000000000000000000000000000000000000000000000000000001",
		address: endUser.evmAccountObjects[0].address,
  });

  console.log("Signature (via client):", result.signature);

  // Alternatively, sign directly on the EndUserAccount (auto-picks first EVM address)
  const result2 = await endUser.signEvmHash({
    hash: "0x0000000000000000000000000000000000000000000000000000000000000002",
  });

  console.log("Signature (via account):", result2.signature);
} catch (error) {
  console.error("Error: ", error);
}
