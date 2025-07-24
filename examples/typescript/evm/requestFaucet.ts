// Usage: pnpm tsx evm/requestFaucet.ts

import { CdpClient } from "@coinbase/cdp-sdk";
import "dotenv/config";

const cdp = new CdpClient({
  apiKeyId: "557730ea-e613-4072-a111-7cd26bcd75a7",
  apiKeySecret: "/b0ignBsNZ6UQshvmQXyG0SejTZ8+WCzQfaRzkSVi9NociYj2a/Ctr9bG7SpDL7nLN3yPHIRb9tW3qJmCd08ig==",
  walletSecret: "MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQgJeO0FLp3FJRFvPUflelGZL7m94gd7jTrua6pMTD/pq+hRANCAATtJxSQNIZUn6c95KK1dsqLWwhKuuv8PT/kHm6HUnli7AQC8V7dTaVYpQWCMY+mcHrjE0zkn1JBdMAOdkM3+Y2C",
  basePath: "http://localhost:8002",
  debugging: true,
});

const account = await cdp.evm.createAccount();
const { transactionHash } = await cdp.evm.requestFaucet({
  address: account.address,
  network: "ethereum-hoodi" as any,
  token: "usdc",
});

console.log(
  `Request faucet funds. Explorer link: https://hoodi.etherscan.io/tx/${transactionHash}`
);
