// Usage: pnpm tsx solana/account.transfer.ts

import { CdpClient } from "@coinbase/cdp-sdk";
import { Connection, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import "dotenv/config";

const cdp = new CdpClient();

const connection = new Connection("https://api.devnet.solana.com");

const sender = await cdp.solana.getOrCreateAccount({
  name: "Sender",
});

const amount = BigInt(0.0001 * LAMPORTS_PER_SOL);

await faucetIfNeeded(sender.address, amount);

const { signature } = await sender.transfer({
  to: "3KzDtddx4i53FBkvCzuDmRbaMozTZoJBb1TToWhz3JfE",
  amount,
  token: "sol",
  network: "devnet",
});

console.log(
  `Sent transaction with signature: ${signature}. Waiting for confirmation...`
);

const { blockhash, lastValidBlockHeight } =
  await connection.getLatestBlockhash();

const confirmation = await connection.confirmTransaction(
  {
    signature,
    blockhash,
    lastValidBlockHeight,
  },
  "confirmed"
);

if (confirmation.value.err) {
  console.log(
    `Something went wrong! Error: ${confirmation.value.err.toString()}`
  );
} else {
  console.log(
    `Transaction confirmed: Link: https://explorer.solana.com/tx/${signature}?cluster=devnet`
  );
}

async function faucetIfNeeded(address: string, amount: bigint) {
  if (amount === 0n) {
    return;
  }

  function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  let balance = await connection.getBalance(new PublicKey(address));

  if (balance > 0) {
    return;
  }

  console.log("Balance too low, requesting SOL from faucet...");
  await sender.requestFaucet({
    token: "sol",
  });

  let attempts = 0;
  const maxAttempts = 30;

  while (balance === 0 && attempts < maxAttempts) {
    balance = await connection.getBalance(new PublicKey(address));
    if (balance === 0) {
      console.log("Waiting for funds...");
      await sleep(1000);
      attempts++;
    }
  }

  if (balance === 0) {
    throw new Error("Account not funded after multiple attempts");
  }

  console.log("Account funded with", balance / LAMPORTS_PER_SOL, "SOL");
}
