// Usage: pnpm tsx evm/account.signTypedData.ts

import { CdpClient } from "@coinbase/cdp-sdk";
import "dotenv/config";

const cdp = new CdpClient();

const account = await cdp.evm.createAccount();

console.log("Created account:", account.address);

const signature = await account.signTypedData({
  domain: {
    name: "Permit2",
    chainId: 1,
    verifyingContract: "0x000000000022D473030F116dDEE9F6B43aC78BA3",
  },
  types: {
    PermitTransferFrom: [
      { name: "permitted", type: "TokenPermissions" },
      { name: "spender", type: "address" },
      { name: "nonce", type: "string" },
      { name: "deadline", type: "string" },
    ],
    TokenPermissions: [
      { name: "token", type: "address" },
      { name: "amount", type: "string" },
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
});

console.log("Signature:", signature);
