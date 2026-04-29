// Usage: pnpm tsx end-users/signWithEndUserAccount.ts <USER_UUID> <ADDRESS>

import { CdpClient } from "@coinbase/cdp-sdk";
import "dotenv/config";

const userId = process.argv[2];
if (!userId) {
  console.error(
    "Usage: pnpm tsx end-users/signWithEndUserAccount.ts <USER_UUID> <ADDRESS>"
  );
  process.exit(1);
}

// optional. if not provided, the user's first EVM address will be used.
const address = process.argv[3];

const cdp = new CdpClient({
  basePath: process.env.CDP_BASE_PATH,
});

try {
  const endUser = await cdp.endUser.getEndUser({ userId });

  console.log("End user:", endUser);

  const signature = await endUser.signEvmMessage({
    message: "Hello, world!",
    address,
  });

  console.log("Signature:", signature);
} catch (error) {
  console.error("Error: ", (error as { errorMessage: string }).errorMessage);
}
