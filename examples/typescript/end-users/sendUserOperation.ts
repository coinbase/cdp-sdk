// Usage: pnpm tsx end-users/sendUserOperation.ts <USER_UUID>
// Note: This example requires the end user to have an active delegation on their
// account that allows the developer to sign on their behalf.

import { CdpClient } from "@coinbase/cdp-sdk";
import "dotenv/config";

const userId = process.argv[2];
if (!userId) {
  console.error("Usage: pnpm tsx end-users/sendUserOperation.ts <USER_UUID>");
  process.exit(1);
}

const cdp = new CdpClient();

try {
  const endUser = await cdp.endUser.getEndUser({ userId });

  if (!endUser.evmSmartAccountObjects?.length) {
    console.error("End user has no smart account. Create one first.");
    process.exit(1);
  }

  console.log("Smart account address:", endUser.evmSmartAccountObjects[0]?.address);

  // Send a user operation using the client method.
  // User operations can batch multiple calls in a single transaction.
  const result = await cdp.endUser.sendUserOperation({
    userId: endUser.userId,
    address: endUser.evmSmartAccountObjects[0].address,
    network: "base-sepolia",
    calls: [
      {
        to: "0x0000000000000000000000000000000000000000",
        value: "0",
        data: "0x",
      },
    ],
    useCdpPaymaster: true, // CDP sponsors the gas
  });

  console.log("User operation hash (via client):", result.userOpHash);

  // Alternatively, send directly on the EndUserAccount (auto-picks first smart account)
  const result2 = await endUser.sendUserOperation({
    network: "base-sepolia",
    calls: [
      {
        to: "0x0000000000000000000000000000000000000000",
        value: "0",
        data: "0x",
      },
    ],
    useCdpPaymaster: true,
  });

  console.log("User operation hash (via account):", result2.userOpHash);
} catch (error) {
  console.error("Error: ", (error as { errorMessage: string }).errorMessage);
}
