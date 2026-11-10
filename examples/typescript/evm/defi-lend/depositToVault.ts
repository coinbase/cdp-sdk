// Usage: pnpm tsx evm/defi-lend/depositToVault.ts <VAULT_ID> <ACCOUNT_ADDRESS> <AMOUNT>

import { CdpClient } from "@coinbase/cdp-sdk";
import "dotenv/config";

const vaultId = process.argv[2];
const accountAddress = process.argv[3] as `0x${string}` | undefined;
const amount = process.argv[4];
if (!vaultId || !accountAddress || !amount) {
  console.error(
    "Usage: pnpm tsx evm/defi-lend/depositToVault.ts <VAULT_ID> <ACCOUNT_ADDRESS> <AMOUNT>",
  );
  process.exit(1);
}

const cdp = new CdpClient();

const { transactionHash } = await cdp.lend.depositToVaultWithEvmAccount({
  address: accountAddress,
  vaultId,
  amount,
});

console.log(
  `Deposited ${amount} into vault ${vaultId} from account: ${accountAddress}`,
);
console.log(`Transaction hash: ${transactionHash}`);
