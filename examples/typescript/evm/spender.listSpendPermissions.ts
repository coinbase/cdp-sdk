// Usage: pnpm tsx evm/spender.listSpendPermissions.ts
// Use --with-create to also create a new spend permission:
//   pnpm tsx evm/spender.listSpendPermissions.ts --with-create

import { CdpClient, parseUnits } from "@coinbase/cdp-sdk";
import "dotenv/config";

const cdp = new CdpClient();

const spender = await cdp.evm.getOrCreateSmartAccount({
  name: "Example-Spender-SmartAccount-1",
  owner: await cdp.evm.getOrCreateAccount({
    name: "Example-Spender-Owner-1",
  }),
});

const account = await cdp.evm.getOrCreateSmartAccount({
  enableSpendPermissions: true,
  name: "Example-Account-SmartAccount-1",
  owner: await cdp.evm.getOrCreateAccount({
    name: "Example-Account-Owner-1",
  }),
});

console.log("Account Address:", account.address);
console.log("Spender Address:", spender.address);

if (process.argv.includes("--with-create")) {
  console.log("Creating spend permission...");
  await cdp.evm.createSpendPermission({
    network: "base-sepolia",
    spendPermission: {
      account: account.address,
      spender: spender.address,
      token: "usdc",
      allowance: parseUnits("0.01", 6),
      periodInDays: 1, // 1 day
    },
  });
  console.log("Spend permission created");
}

const allPermissions = await cdp.evm.listSpendPermissions({
  address: account.address,
});

const permissionsForSpender = allPermissions.spendPermissions.filter(
  (permission) => {
    return permission.permission?.spender === spender.address.toLowerCase();
  }
);

console.log(
  `Permissions for spender ${spender.address} granted by ${account.address}:`
);
prettyPrint(permissionsForSpender);

function prettyPrint(obj: object) {
  return console.log(JSON.stringify(obj, null, 2));
}
