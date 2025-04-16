// Usage: pnpm tsx src/examples/evm/signTransaction.ts

import { config } from "dotenv";
import { parseEther, serializeTransaction } from "viem";
import { baseSepolia } from "viem/chains";

import { CdpClient } from "../../index";

/**
 * This example shows how to sign an EVM transaction.
 */
async function main() {
  config();

  const cdp = new CdpClient();

  const ethAccount = await cdp.evm.createAccount({});

  console.log("EVM Account Address: ", ethAccount.address);

  const serializedTx = serializeTransaction({
    chainId: baseSepolia.id,
    data: "0x",
    to: "0x4252e0c9A3da5A2700e7d91cb50aEf522D0C6Fe8",
    type: "eip1559",
    value: parseEther("0.000001"),
  });

  const signature = await cdp.evm.signTransaction({
    address: ethAccount.address,
    transaction: serializedTx,
  });

  console.log("Signature: ", signature);
}

main().catch(console.error);
