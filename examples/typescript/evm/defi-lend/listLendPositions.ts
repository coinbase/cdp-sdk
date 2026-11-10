// Usage: pnpm tsx evm/defi-lend/listLendPositions.ts <ADDRESS> [VAULT_ID...]

import { CdpClient } from "@coinbase/cdp-sdk";
import "dotenv/config";

const address = process.argv[2];
const vaultIds = process.argv.slice(3);
if (!address) {
  console.error("Usage: pnpm tsx evm/defi-lend/listLendPositions.ts <ADDRESS> [VAULT_ID...]");
  process.exit(1);
}

const cdp = new CdpClient();

let pageToken: string | undefined;
do {
  const page = await cdp.lend.listLendPositions({
    address,
    vaultIds: vaultIds.length > 0 ? vaultIds : undefined,
    pageToken,
  });

  for (const position of page.lendPositions) {
    console.log(`${position.vaultId} on ${position.network}`);
    console.log(`  Shares: ${position.vaultShares}`);
    console.log(`  Balance: ${position.assetBalance} ${position.underlyingAsset}`);
  }

  pageToken = page.nextPageToken;
} while (pageToken);
