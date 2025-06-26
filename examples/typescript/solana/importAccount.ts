// Usage: pnpm tsx evm/importAccount.ts

import { CdpClient } from "@coinbase/cdp-sdk";
import "dotenv/config";
import { generatePrivateKey } from "viem/accounts";
import { Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import bs58 from 'bs58';


const cdp = new CdpClient();

const keypair = Keypair.generate();
const privateKey = bs58.encode(keypair.secretKey);

const account = await cdp.solana.importAccount({
  privateKey: privateKey,
});

console.log("Imported account: ", account.address);