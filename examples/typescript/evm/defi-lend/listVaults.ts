// Usage: pnpm tsx evm/defi-lend/listVaults.ts

import { CdpClient } from "@coinbase/cdp-sdk";
import "dotenv/config";

const cdp = new CdpClient();

let pageToken: string | undefined;
do {
  const page = await cdp.lend.listVaults({ pageToken });

  for (const vault of page.vaults) {
    console.log(
      `${vault.vaultId} ${vault.status} ${vault.underlyingAsset} on ${vault.network}`,
    );
    console.log(`  APY: ${vault.metrics?.apyBps ?? "n/a"} bps`);
    console.log(`  TVL: ${vault.metrics?.tvl ?? "n/a"}`);
  }

  pageToken = page.nextPageToken;
} while (pageToken);
