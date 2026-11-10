// Usage: pnpm tsx evm/defi-lend/withdrawFromVault.ts <VAULT_ID> <ACCOUNT_ADDRESS> <AMOUNT|all>

import { CdpClient } from "@coinbase/cdp-sdk";
import "dotenv/config";

const vaultId = process.argv[2];
const accountAddress = process.argv[3] as `0x${string}` | undefined;
const amount = process.argv[4];
if (!vaultId || !accountAddress || !amount) {
  console.error(
    "Usage: pnpm tsx evm/defi-lend/withdrawFromVault.ts <VAULT_ID> <ACCOUNT_ADDRESS> <AMOUNT|all>",
  );
  process.exit(1);
}

const cdp = new CdpClient();

const { transactionHash } = await cdp.lend.withdrawFromVaultWithEvmAccount({
  address: accountAddress,
  vaultId,
  ...(amount === "all" ? { withdrawAll: true } : { amount }),
});

console.log(
  `Withdrew ${amount} from vault ${vaultId} to account: ${accountAddress}`,
);
console.log(`Transaction hash: ${transactionHash}`);
