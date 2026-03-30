// Usage: pnpm tsx end-users/sendEvmTransaction.ts <USER_UUID>
// Note: This example requires the end user to have an active delegation on their
// account that allows the developer to sign on their behalf.

import { CdpClient } from "@coinbase/cdp-sdk";
import "dotenv/config";

const userId = process.argv[2];
if (!userId) {
  console.error("Usage: pnpm tsx end-users/sendEvmTransaction.ts <USER_UUID>");
  process.exit(1);
}

const cdp = new CdpClient();

try {
  const endUser = await cdp.endUser.getEndUser({ userId });

  console.log("EVM address:", endUser.evmAccountObjects[0]?.address);

  // Send an EVM transaction using the client method (developer calls on behalf of end user)
  const result = await cdp.endUser.sendEvmTransaction({
    userId: endUser.userId,
    address: endUser.evmAccountObjects[0].address,
    transaction: "0x02...", // RLP-serialized EIP-1559 transaction
    network: "base-sepolia",
  });

  console.log("Transaction hash (via client):", result.transactionHash);

  // Alternatively, send directly on the EndUserAccount (auto-picks first EVM address)
  const result2 = await endUser.sendEvmTransaction({
    transaction: "0x02...",
    network: "base-sepolia",
  });

  console.log("Transaction hash (via account):", result2.transactionHash);
} catch (error) {
  console.error("Error: ", (error as { errorMessage: string }).errorMessage);
}
