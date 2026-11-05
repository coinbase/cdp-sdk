// Usage: pnpm tsx evm/defi-lend/getVault.ts <VAULT_ID>

import { CdpClient } from "@coinbase/cdp-sdk";
import "dotenv/config";

const vaultId = process.argv[2];
if (!vaultId) {
  console.error("Usage: pnpm tsx evm/defi-lend/getVault.ts <VAULT_ID>");
  process.exit(1);
}

const cdp = new CdpClient();

const vault = await cdp.lend.getVault({ vaultId });

console.log(`Vault: ${vault.vaultId}`);
console.log(`Address: ${vault.address}`);
console.log(`Status: ${vault.status}`);
console.log(`Underlying asset: ${vault.underlyingAsset} on ${vault.network}`);
console.log(`Performance fee: ${vault.performanceFeeBps} bps`);
console.log(`APY: ${vault.metrics?.apyBps ?? "n/a"} bps`);
console.log(`TVL: ${vault.metrics?.tvl ?? "n/a"}`);
