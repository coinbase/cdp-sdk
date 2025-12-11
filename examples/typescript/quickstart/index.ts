#!/usr/bin/env node
import { parseEther } from "viem";
import { CdpClient } from "@coinbase/cdp-sdk";
import readline from "readline/promises";
import { stdin as input, stdout as output } from "process";
import { homedir } from "os";
import { join } from "path";
import { readdir, readFile, stat } from "fs/promises";

// 🔍 Look for the latest-mtime matching file
async function findLatestFile(dir: string, prefix: string, suffix: string) {
  const files = (await readdir(dir)).filter(
    f => f.startsWith(prefix) && f.endsWith(suffix)
  );

  if (files.length === 0) return null;

  const withTime = await Promise.all(
    files.map(async file => ({
      file,
      mtime: (await stat(join(dir, file))).mtime.getTime(),
    }))
  );

  return withTime.sort((a, b) => b.mtime - a.mtime)[0].file;
}

// 👇 Check for local files first
const downloadsDir = join(homedir(), "Downloads");
let CDP_API_KEY_ID: string | undefined;
let CDP_API_KEY_SECRET: string | undefined;
let CDP_WALLET_SECRET: string | undefined;

try {
  const keyFile = await findLatestFile(downloadsDir, "cdp_api_key", ".json");
  if (keyFile) {
    const keyJson = JSON.parse(await readFile(join(downloadsDir, keyFile), "utf-8"));
    CDP_API_KEY_ID = keyJson.id;
    CDP_API_KEY_SECRET = keyJson.privateKey;
    console.log(`🔐 Loaded API key from ${keyFile}`);
  }

  const walletFile = await findLatestFile(downloadsDir, "cdp_wallet_secret", ".txt");
  if (walletFile) {
    CDP_WALLET_SECRET = (await readFile(join(downloadsDir, walletFile), "utf-8")).trim();
    console.log(`🔐 Loaded wallet secret from ${walletFile}`);
  }
} catch (err) {
  console.warn("⚠️ Error loading local key files:", err);
}

// 👂 Fallback to prompt
const rl = readline.createInterface({ input, output });

if (!CDP_API_KEY_ID) CDP_API_KEY_ID = await rl.question("Enter CDP_API_KEY_ID: ");
if (!CDP_API_KEY_SECRET) CDP_API_KEY_SECRET = await rl.question("Enter CDP_API_KEY_SECRET: ");
if (!CDP_WALLET_SECRET) CDP_WALLET_SECRET = await rl.question("Enter CDP_WALLET_SECRET: ");
rl.close();

// 🧪 Validate
if (!CDP_API_KEY_ID || !CDP_API_KEY_SECRET || !CDP_WALLET_SECRET) {
  throw new Error("❌ One or more secrets were not provided.");
}

// ⚙️ Init clients
const cdp = new CdpClient({
  apiKeyId: CDP_API_KEY_ID,
  apiKeySecret: CDP_API_KEY_SECRET,
  walletSecret: CDP_WALLET_SECRET,
});

// 🪪 Create account
const account = await cdp.evm.createAccount();
console.log("✅ Created EVM account:", account.address);

const baseSepoliaAccount = await account.useNetwork("base-sepolia");

// 💧 Faucet
const { transactionHash: faucetTx } = await baseSepoliaAccount.requestFaucet({
  token: "eth",
});
await baseSepoliaAccount.waitForTransactionReceipt({ hash: faucetTx });
console.log("🚰 Received testnet ETH:", faucetTx);

// 🧾 Send tx
const { transactionHash } = await baseSepoliaAccount.sendTransaction({
  transaction: {
    to: "0x0000000000000000000000000000000000000000",
    value: parseEther("0.000001"),
  },
});
await baseSepoliaAccount.waitForTransactionReceipt({ hash: transactionHash });
console.log(`📦 TX confirmed: https://sepolia.basescan.org/tx/${transactionHash}`);
