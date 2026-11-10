// Usage: pnpm tsx evm/defi-lend/withdrawFromVaultWithSmartAccount.ts <VAULT_ID> <SMART_ACCOUNT_ADDRESS> <AMOUNT|all>

import { CdpClient } from "@coinbase/cdp-sdk";
import "dotenv/config";

const vaultId = process.argv[2];
const smartAccountAddress = process.argv[3] as `0x${string}` | undefined;
const amount = process.argv[4];
if (!vaultId || !smartAccountAddress || !amount) {
  console.error(
    "Usage: pnpm tsx evm/defi-lend/withdrawFromVaultWithSmartAccount.ts <VAULT_ID> <SMART_ACCOUNT_ADDRESS> <AMOUNT|all>",
  );
  process.exit(1);
}

const cdp = new CdpClient();

const { userOpHash } = await cdp.lend.withdrawFromVaultWithEvmSmartAccount({
  address: smartAccountAddress,
  vaultId,
  ...(amount === "all" ? { withdrawAll: true } : { amount }),
  useCdpPaymaster: true,
});

console.log("Sent vault withdrawal, waiting for it to complete...");

const result = await cdp.evm.waitForUserOperation({
  smartAccountAddress,
  userOpHash: userOpHash as `0x${string}`,
});

if (result.status === "failed") {
  console.error(`Withdrawal failed: ${userOpHash}`);
  process.exit(1);
}

console.log(
  `Withdrew ${amount} from vault ${vaultId} to smart account: ${smartAccountAddress}`,
);
console.log(`User operation status: ${result.status}`);
if (result.status === "complete") {
  console.log(`Transaction hash: ${result.transactionHash}`);
}
