// Usage: pnpm tsx evm/defi-lend/redeemVaultFees.ts <VAULT_ID> <FEE_RECIPIENT_ADDRESS>

import { CdpClient } from "@coinbase/cdp-sdk";
import "dotenv/config";

const vaultId = process.argv[2];
const feeRecipientAddress = process.argv[3] as `0x${string}` | undefined;
if (!vaultId || !feeRecipientAddress) {
  console.error(
    "Usage: pnpm tsx evm/defi-lend/redeemVaultFees.ts <VAULT_ID> <FEE_RECIPIENT_ADDRESS>",
  );
  process.exit(1);
}

const cdp = new CdpClient();

const account = await cdp.evm.getAccount({ address: feeRecipientAddress });

const { transactionHash } = await account.redeemVaultFees({ vaultId });

console.log(`Redeemed vault fees for account: ${account.address}`);
console.log(`Transaction hash: ${transactionHash}`);
