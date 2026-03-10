// Usage: pnpm tsx evm/smart-accounts/smartAccount.signTypedData.ts

import { CdpClient } from "@coinbase/cdp-sdk";
import "dotenv/config";

const cdp = new CdpClient();

const owner = await cdp.evm.getOrCreateAccount({
  name: "SignTypedData-Example-Owner",
});

const smartAccount = await cdp.evm.getOrCreateSmartAccount({
  owner,
  name: "SignTypedData-Example-SmartAccount",
});

console.log("Created smart account:", smartAccount.address);

const signature = await smartAccount.signTypedData({
  domain: {
    name: "Test",
    chainId: 84532,
    verifyingContract: "0x0000000000000000000000000000000000000000",
  },
  types: {
    Test: [{ name: "name", type: "string" }],
  },
  primaryType: "Test",
  message: {
    name: "John Doe",
  },
  network: "base-sepolia",
});

console.log("Signature:", signature);
