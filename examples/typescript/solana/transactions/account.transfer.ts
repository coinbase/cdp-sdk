// Usage: pnpm tsx solana/transactions/account.transfer.ts

import { CdpClient } from "@coinbase/cdp-sdk";
import {
  createSolanaRpc,
  address as solanaAddress,
  Signature,
} from "@solana/kit";
import "dotenv/config";

const LAMPORTS_PER_SOL = 1_000_000_000;

const cdp = new CdpClient();

const rpc = createSolanaRpc("https://api.devnet.solana.com");

const sender = await cdp.solana.getOrCreateAccount({
  name: "Sender",
});

const amount = BigInt(0.000001 * LAMPORTS_PER_SOL);

await faucetIfNeeded(sender.address, amount);

const { signature } = await sender.transfer({
  to: "3KzDtddx4i53FBkvCzuDmRbaMozTZoJBb1TToWhz3JfE",
  amount,
  token: "sol",
  network: "devnet",
});

console.log(
  `Sent transaction with signature: ${signature}. Waiting for confirmation...`,
);

try {
  await confirmTransaction(rpc, signature);
  console.log(
    `Transaction confirmed: Link: https://explorer.solana.com/tx/${signature}?cluster=devnet`,
  );
} catch (error) {
  console.log(`Something went wrong! Error: ${error}`);
}

async function faucetIfNeeded(addr: string, amt: bigint) {
  if (amt === 0n) {
    return;
  }

  let balance = (await rpc.getBalance(solanaAddress(addr)).send()).value;

  if (balance > 0n) {
    return;
  }

  console.log("Balance too low, requesting SOL from faucet...");
  await sender.requestFaucet({
    token: "sol",
  });

  let attempts = 0;
  const maxAttempts = 30;

  while (balance === 0n && attempts < maxAttempts) {
    balance = (await rpc.getBalance(solanaAddress(addr)).send()).value;
    if (balance === 0n) {
      console.log("Waiting for funds...");
      await sleep(1000);
      attempts++;
    }
  }

  if (balance === 0n) {
    throw new Error("Account not funded after multiple attempts");
  }

  console.log("Account funded with", Number(balance) / LAMPORTS_PER_SOL, "SOL");
}

async function confirmTransaction(
  rpcClient: ReturnType<typeof createSolanaRpc>,
  sig: string,
): Promise<void> {
  const maxAttempts = 30;
  for (let i = 0; i < maxAttempts; i++) {
    const result = await rpcClient
      .getSignatureStatuses([sig as Signature])
      .send();
    const status = result.value[0];
    if (
      status !== null &&
      (status.confirmationStatus === "confirmed" ||
        status.confirmationStatus === "finalized")
    ) {
      if (status.err !== null)
        throw new Error(`Transaction failed: ${JSON.stringify(status.err)}`);
      return;
    }
    await sleep(1000);
  }
  throw new Error(
    `Transaction ${sig} not confirmed after ${maxAttempts} attempts`,
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
