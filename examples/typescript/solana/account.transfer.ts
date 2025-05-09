// Usage: pnpm tsx solana/account.transfer.ts

import { CdpClient } from "@coinbase/cdp-sdk";
import "dotenv/config";

const cdp = new CdpClient();

const sender = await cdp.solana.getOrCreateAccount({
  name: "Sender",
});

const amount = "0.0001";

await faucetIfNeeded(sender.address, amount);

const transfer = await sender.transfer({
  to: "3KzDtddx4i53FBkvCzuDmRbaMozTZoJBb1TToWhz3JfE",
  amount,
  token: "sol",
  network: "devnet",
});

console.log(
  `Sent transaction with signature: ${transfer.signature}. Waiting for confirmation...`
);

const { signature } = await sender.waitForTransactionConfirmation({
  signature: transfer.signature,
  network: "devnet",
});

console.log(
  `Transaction confirmed: Link: https://explorer.solana.com/tx/${signature}?cluster=devnet`
);

async function faucetIfNeeded(address: string, amount: string) {
  function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  const { Connection, PublicKey, LAMPORTS_PER_SOL } = await import(
    "@solana/web3.js"
  );
  const connection = new Connection("https://api.devnet.solana.com");

  const lamportsToSend = Number(amount) * LAMPORTS_PER_SOL;

  // Wait until the address has balance
  let balance = 0;

  if (balance < lamportsToSend) {
    await sender.requestFaucet({
      token: "sol",
    });
  }

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

  console.log("Account funded with", balance / 1e9, "SOL");
}
