// Usage: pnpm tsx evm/defi-lend/redeemVaultFeesWithSmartAccount.ts <VAULT_ID> <FEE_RECIPIENT_ADDRESS> <OWNER_ADDRESS>

import { CdpClient } from "@coinbase/cdp-sdk";
import "dotenv/config";

const vaultId = process.argv[2];
const feeRecipientAddress = process.argv[3] as `0x${string}` | undefined;
const ownerAddress = process.argv[4] as `0x${string}` | undefined;
if (!vaultId || !feeRecipientAddress || !ownerAddress) {
  console.error(
    "Usage: pnpm tsx evm/defi-lend/redeemVaultFeesWithSmartAccount.ts <VAULT_ID> <FEE_RECIPIENT_ADDRESS> <OWNER_ADDRESS>",
  );
  process.exit(1);
}

const cdp = new CdpClient();

const owner = await cdp.evm.getAccount({ address: ownerAddress });
const smartAccount = await cdp.evm.getSmartAccount({
  address: feeRecipientAddress,
  owner,
});

const { userOpHash } = await smartAccount.redeemVaultFees({
  vaultId,
  useCdpPaymaster: true,
});

console.log("Sent vault fee redemption, waiting for it to complete...");

const result = await smartAccount.waitForUserOperation({ userOpHash });

console.log(`Redeemed vault fees for smart account: ${smartAccount.address}`);
console.log(`User operation status: ${result.status}`);
if (result.status === "complete") {
  console.log(`Transaction hash: ${result.transactionHash}`);
}
