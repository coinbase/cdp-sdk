// Usage: pnpm tsx policies/signTypedDataPolicy.ts

import { CdpClient } from "@coinbase/cdp-sdk";
import "dotenv/config";

const cdp = new CdpClient();

const permitPolicy = await cdp.policies.createPolicy({
  policy: {
    scope: "account",
    rules: [
      {
        action: "accept",
        operation: "signEvmTypedData",
        criteria: [
          {
            type: "evmTypedDataField",
            types: {
              primaryType: "Permit",
              types: {
                EIP712Domain: [
                  { name: "name", type: "string" },
                  { name: "version", type: "string" },
                  { name: "chainId", type: "uint256" },
                  { name: "verifyingContract", type: "address" },
                ],
                Permit: [{ name: "value", type: "uint256" }],
              },
            },
            conditions: [
              {
                path: "value",
                operator: "<=",
                value: "1000000000000000000000", // Max 1000 tokens (assuming 18 decimals)
              },
            ],
          },
        ],
      },
    ],
  },
});

console.log("Created permit policy. Policy ID:", permitPolicy.id);

const account = await cdp.evm.createAccount({
  accountPolicy: permitPolicy.id,
});

// Permitted by the policy
const signature = await account.signTypedData({
  types: {
    Permit: [{ name: "value", type: "uint256" }],
  },
  message: {
    value: 1000000000000000000000n,
  },
  primaryType: "Permit",
  domain: {
    name: "Test",
  },
});

console.log("Signature:", signature);

try {
  // Not permitted by the policy
  await account.signTypedData({
    types: {
      Permit: [{ name: "value", type: "uint256" }],
    },
    message: {
      value: 1000000000000000000001n,
    },
    primaryType: "Permit",
    domain: {
      name: "Test",
    },
  });
} catch (error) {
  console.log("Error:", error);
}
