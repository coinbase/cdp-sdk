// Usage: pnpm tsx end-users/createEvmEip7702Delegation.ts <USER_UUID>

import { CdpClient } from "@coinbase/cdp-sdk";
import "dotenv/config";

const userId = process.argv[2];
if (!userId) {
  console.error(
    "Usage: pnpm tsx end-users/createEvmEip7702Delegation.ts <USER_UUID>"
  );
  process.exit(1);
}

const cdp = new CdpClient();

try {
  const endUser = await cdp.endUser.getEndUser({ userId });

  console.log("EVM address:", endUser.evmAccountObjects[0]?.address);

  // Create an EIP-7702 delegation using the client method (developer calls on behalf of end user)
  const result = await cdp.endUser.createEvmEip7702Delegation({
    userId: endUser.userId,
    address: endUser.evmAccountObjects[0].address,
    network: "base-sepolia",
    enableSpendPermissions: true,
  });

  console.log(
    "Delegation operation ID (via client):",
    result.delegationOperationId
  );

  // Alternatively, create directly on the EndUserAccount (auto-picks first EVM address)
  const result2 = await endUser.createEvmEip7702Delegation({
    network: "base-sepolia",
    enableSpendPermissions: true,
  });

  console.log(
    "Delegation operation ID (via account):",
    result2.delegationOperationId
  );
} catch (error) {
  console.error("Error: ", (error as { errorMessage: string }).errorMessage);
}
