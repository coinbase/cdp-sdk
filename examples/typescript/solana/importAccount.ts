// Usage: pnpm tsx evm/importAccount.ts

import { CdpClient } from "@coinbase/cdp-sdk";
import "dotenv/config";
import { generatePrivateKey } from "viem/accounts";
import { Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import bs58 from 'bs58';


const cdp = new CdpClient({
  apiKeyId: "557730ea-e613-4072-a111-7cd26bcd75a7",
  apiKeySecret: "/b0ignBsNZ6UQshvmQXyG0SejTZ8+WCzQfaRzkSVi9NociYj2a/Ctr9bG7SpDL7nLN3yPHIRb9tW3qJmCd08ig==",
  walletSecret: "MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQgJeO0FLp3FJRFvPUflelGZL7m94gd7jTrua6pMTD/pq+hRANCAATtJxSQNIZUn6c95KK1dsqLWwhKuuv8PT/kHm6HUnli7AQC8V7dTaVYpQWCMY+mcHrjE0zkn1JBdMAOdkM3+Y2C",
  basePath: "https://cloud-api-dev.cbhq.net/platform",
});

const keypair = Keypair.generate();
const privateKey = Buffer.from(keypair.secretKey.slice(0, 32));

console.log("privateKey", privateKey.toString("base64"));

const account = await cdp.solana.importAccount({
  privateKey: privateKey,
});

console.log("Imported account: ", account.address);