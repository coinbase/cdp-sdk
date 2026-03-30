// Usage: pnpm tsx end-users/sendEvmAsset.ts <USER_UUID>
// Note: This example requires the end user to have an active delegation on their
// account that allows the developer to sign on their behalf.

import { CdpClient } from "@coinbase/cdp-sdk";
import "dotenv/config";

const userId = process.argv[2];
if (!userId) {
  console.error("Usage: pnpm tsx end-users/sendEvmAsset.ts <USER_UUID>");
  process.exit(1);
}

const cdp = new CdpClient();

try {
  const endUser = await cdp.endUser.getEndUser({ userId });

  console.log("EVM address:", endUser.evmAccountObjects[0]?.address);

  // Send USDC using the client method (developer calls on behalf of end user)
  const result = await cdp.endUser.sendEvmAsset({
    userId: endUser.userId,
    address: endUser.evmAccountObjects[0].address,
    asset: "usdc",
    to: "0x0000000000000000000000000000000000000001", // recipient address
    amount: "1000000", // 1 USDC (6 decimals)
    network: "base-sepolia",
  });

  console.log("Transaction hash (via client):", result.transactionHash);

  // Alternatively, send directly on the EndUserAccount (auto-picks first EVM address)
  const result2 = await endUser.sendEvmAsset({
    asset: "usdc",
    to: "0x0000000000000000000000000000000000000001",
    amount: "1000000",
    network: "base-sepolia",
  });

  console.log("Transaction hash (via account):", result2.transactionHash);
} catch (error) {
  console.error("Error: ", (error as { errorMessage: string }).errorMessage);
}
