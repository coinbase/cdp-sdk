// Usage: pnpm tsx end-users/signEvmTypedData.ts <USER_UUID>
// Note: This example requires the end user to have an active delegation on their
// account that allows the developer to sign on their behalf.

import { CdpClient } from "@coinbase/cdp-sdk";
import "dotenv/config";

const userId = process.argv[2];
if (!userId) {
  console.error("Usage: pnpm tsx end-users/signEvmTypedData.ts <USER_UUID>");
  process.exit(1);
}

const cdp = new CdpClient();

try {
  const endUser = await cdp.endUser.getEndUser({ userId });

  console.log("EVM address:", endUser.evmAccountObjects[0]?.address);

  // Build an EIP-712 typed data payload (Permit2 PermitTransferFrom)
  const typedData = {
    domain: {
      name: "Permit2",
      chainId: 1,
      verifyingContract: "0x000000000022D473030F116dDEE9F6B43aC78BA3" as `0x${string}`,
    },
    types: {
      EIP712Domain: [
        { name: "name", type: "string" },
        { name: "chainId", type: "uint256" },
        { name: "verifyingContract", type: "address" },
      ],
      PermitTransferFrom: [
        { name: "permitted", type: "TokenPermissions" },
        { name: "spender", type: "address" },
        { name: "nonce", type: "uint256" },
        { name: "deadline", type: "uint256" },
      ],
      TokenPermissions: [
        { name: "token", type: "address" },
        { name: "amount", type: "uint256" },
      ],
    },
    primaryType: "PermitTransferFrom",
    message: {
      permitted: {
        token: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
        amount: "1000000",
      },
      spender: "0xFfFfFfFFfFFfFFfFFfFFFFFffFFFffffFfFFFfFf",
      nonce: "0",
      deadline: "1717123200",
    },
  };

  // Sign EIP-712 typed data using the client method (developer calls on behalf of end user)
  const result = await cdp.endUser.signEvmTypedData({
    userId: endUser.userId,
    address: endUser.evmAccountObjects[0].address,
    typedData,
  });

  console.log("Signature (via client):", result.signature);

  // Alternatively, sign directly on the EndUser object (auto-picks first EVM address)
  const result2 = await endUser.signEvmTypedData({ typedData });

  console.log("Signature (via account):", result2.signature);
} catch (error) {
  console.error("Error: ", (error as { errorMessage: string }).errorMessage);
}
