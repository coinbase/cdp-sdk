// Usage: pnpm tsx evm/signTransaction.ts

import { CdpClient } from "@coinbase/cdp-sdk";

import { parseEther, serializeTransaction } from "viem";
import { baseSepolia } from "viem/chains";
import "dotenv/config";

const cdp = new CdpClient();

const account = await cdp.evm.createAccount();

console.log("Created account:", account.address);

const serializedTx = serializeTransaction({
  chainId: baseSepolia.id,
  data: "0x",
  to: "0x4252e0c9A3da5A2700e7d91cb50aEf522D0C6Fe8",
  type: "eip1559",
  value: parseEther("0.000001"),
});

const signature = await cdp.evm.signTransaction({
  address: account.address,
  transaction: serializedTx,
});

console.log("Signature:", signature);
