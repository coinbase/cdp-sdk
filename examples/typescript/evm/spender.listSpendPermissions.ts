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

const grantor = await cdp.evm.getOrCreateSmartAccount({
  __experimental_enableSpendPermission: true,
  name: "Example-Grantor-SmartAccount-1",
  owner: await cdp.evm.getOrCreateAccount({
    name: "Example-Grantor-Owner-1",
  }),
});

console.log("Grantor Address:", grantor.address);
console.log("Spender Address:", spender.address);

if (process.argv.includes("--with-create")) {
  console.log("Creating spend permission...");
  await cdp.evm.createSpendPermission({
    network: "base-sepolia",
    spendPermission: {
      account: grantor.address,
      spender: spender.address,
      token: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
      allowance: parseUnits("0.01", 6),
      period: 60 * 60, // 1 hour
      start: 0,
      end: Date.now() + 24 * 60 * 60 * 1000, // in one day
      salt: 0n,
      extraData: "0x",
    },
  });
  console.log("Spend permission created");
}

const allPermissions = await cdp.evm.listSpendPermissions({
  address: grantor.address,
});

const permissionsForSpender = allPermissions.spendPermissions.filter(
  (permission) => {
    return permission.permission?.spender === spender.address.toLowerCase();
  }
);

console.log(
  `Permissions for spender ${spender.address} granted by ${grantor.address}:`
);
prettyPrint(permissionsForSpender);

function prettyPrint(obj: object) {
  return console.log(JSON.stringify(obj, null, 2));
}
