// Usage: pnpm tsx end-users/signEvmTransaction.ts <USER_UUID>
// Note: This example requires the end user to have an active delegation on their
// account that allows the developer to sign on their behalf.

import { CdpClient } from "@coinbase/cdp-sdk";
import { serializeTransaction } from "viem";
import { baseSepolia } from "viem/chains";
import "dotenv/config";

const userId = process.argv[2];
if (!userId) {
  console.error("Usage: pnpm tsx end-users/signEvmTransaction.ts <USER_UUID>");
  process.exit(1);
}

const cdp = new CdpClient({ debugging: true });

try {
  const endUser = await cdp.endUser.getEndUser({ userId });

  console.log("EVM address:", endUser.evmAccountObjects[0]?.address);

  // Build a valid unsigned EIP-1559 transaction
  const transaction = serializeTransaction({
    chainId: baseSepolia.id,
    to: "0x0000000000000000000000000000000000000000",
    value: BigInt(0),
    type: "eip1559",
    maxFeePerGas: BigInt(20000000000),
    maxPriorityFeePerGas: BigInt(1000000000),
    gas: BigInt(21000),
    nonce: 0,
  });

  // Sign an EVM transaction using the client method (developer calls on behalf of end user)
  const result = await cdp.endUser.signEvmTransaction({
    userId: endUser.userId,
    address: endUser.evmAccountObjects[0].address,
    transaction,
  });

  console.log("Signed transaction (via client):", result.signedTransaction);

  // Alternatively, sign directly on the EndUser object (auto-picks first EVM address)
  const result2 = await endUser.signEvmTransaction({ transaction });

  console.log("Signed transaction (via account):", result2.signedTransaction);
} catch (error) {
  console.error("Error: ", (error as { errorMessage: string }).errorMessage);
}
