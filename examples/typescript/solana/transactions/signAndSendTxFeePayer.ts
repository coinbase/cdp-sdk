// Usage: pnpm tsx solana/transactions/signAndSendTxFeePayer.ts [sourceAddress]

import { CdpClient } from "@coinbase/cdp-sdk";
import "dotenv/config";

import {
  address as solanaAddress,
  appendTransactionMessageInstructions,
  Base64EncodedWireTransaction,
  compileTransaction,
  createNoopSigner,
  createSolanaRpc,
  createTransactionMessage,
  getBase64EncodedWireTransaction,
  pipe,
  setTransactionMessageFeePayer,
  setTransactionMessageLifetimeUsingBlockhash,
  Signature,
} from "@solana/kit";
import { getTransferSolInstruction } from "@solana-program/system";

const LAMPORTS_PER_SOL = 1_000_000_000;

async function main(sourceAddress?: string) {
  const cdp = new CdpClient();

  // Required: Destination address to send SOL to
  const destinationAddress = "3KzDtddx4i53FBkvCzuDmRbaMozTZoJBb1TToWhz3JfE";

  // Amount of lamports to send (default: 1000 = 0.000001 SOL)
  const lamportsToSend = 1000;

  try {
    const rpc = createSolanaRpc("https://api.devnet.solana.com");

    const feePayer = await cdp.solana.getOrCreateAccount({
      name: "test-sol-account-relayer",
    });
    console.log("Fee payer address: " + feePayer.address);

    // Request funds on the feePayer address.
    await requestFaucetAndWaitForBalance(cdp, feePayer.address, rpc);

    let fromAddress: string;
    if (sourceAddress) {
      fromAddress = sourceAddress;
      console.log("Using existing SOL account:", fromAddress);
    } else {
      const account = await cdp.solana.getOrCreateAccount({
        name: "test-sol-account",
      });

      fromAddress = account.address;
      console.log("Successfully created new SOL account:", fromAddress);

      // Request funds to send on the from address.
      await requestFaucetAndWaitForBalance(cdp, fromAddress, rpc);
    }

    const balance = (await rpc.getBalance(solanaAddress(fromAddress)).send())
      .value;
    if (balance < BigInt(lamportsToSend)) {
      throw new Error(
        `Insufficient balance: ${balance} lamports, need at least ${lamportsToSend} lamports`,
      );
    }

    const {
      value: { blockhash, lastValidBlockHeight },
    } = await rpc.getLatestBlockhash().send();

    const instruction = getTransferSolInstruction({
      source: createNoopSigner(solanaAddress(fromAddress)),
      destination: solanaAddress(destinationAddress),
      amount: BigInt(lamportsToSend),
    });

    const txMsg = pipe(
      createTransactionMessage({ version: 0 }),
      (tx) =>
        setTransactionMessageFeePayer(solanaAddress(feePayer.address), tx),
      (tx) =>
        setTransactionMessageLifetimeUsingBlockhash(
          { blockhash, lastValidBlockHeight },
          tx,
        ),
      (tx) => appendTransactionMessageInstructions([instruction], tx),
    );

    const serializedTx = getBase64EncodedWireTransaction(
      compileTransaction(txMsg),
    );

    // Sign with the funding account.
    const signedTxResponse = await cdp.solana.signTransaction({
      address: fromAddress,
      transaction: serializedTx,
    });

    const signedBase64Tx = signedTxResponse.signature; // base64

    // Sign with the feePayer account.
    const finalSignedTxResponse = await cdp.solana.signTransaction({
      address: feePayer.address,
      transaction: signedBase64Tx,
    });

    // Send the signed transaction to the network.
    const signature = await rpc
      .sendTransaction(
        finalSignedTxResponse.signature as Base64EncodedWireTransaction,
        { encoding: "base64" },
      )
      .send();

    await confirmTransaction(rpc, signature);

    console.log("Transaction confirmed: success");
    console.log(
      `Transaction explorer link: https://explorer.solana.com/tx/${signature}?cluster=devnet`,
    );

    return {
      fromAddress,
      destinationAddress,
      amount: lamportsToSend / LAMPORTS_PER_SOL,
      signature,
      success: true,
    };
  } catch (error) {
    console.error("Error processing SOL transaction:", error);
    throw error;
  }
}

async function confirmTransaction(
  rpcClient: ReturnType<typeof createSolanaRpc>,
  sig: Signature,
): Promise<void> {
  const maxAttempts = 30;
  for (let i = 0; i < maxAttempts; i++) {
    const result = await rpcClient.getSignatureStatuses([sig]).send();
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

/**
 * Sleeps for a given number of milliseconds
 *
 * @param {number} ms - The number of milliseconds to sleep
 * @returns {Promise<void>} A promise that resolves when the sleep is complete
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Requests funds from the faucet and waits for the balance to be available
 *
 * @param {CdpClient} cdp - The CDP client instance
 * @param {string} address - The address to fund
 * @param {ReturnType<typeof createSolanaRpc>} rpc - The Solana RPC client
 * @returns {Promise<void>} A promise that resolves when the account is funded
 */
async function requestFaucetAndWaitForBalance(
  cdp: CdpClient,
  address: string,
  rpc: ReturnType<typeof createSolanaRpc>,
): Promise<void> {
  // Request funds from faucet
  const faucetResp = await cdp.solana.requestFaucet({
    address: address,
    token: "sol",
  });
  console.log(`Successfully requested SOL from faucet:`, faucetResp.signature);

  // Wait until the address has balance
  let balance = 0n;
  let attempts = 0;
  const maxAttempts = 30;

  while (balance === 0n && attempts < maxAttempts) {
    balance = (await rpc.getBalance(solanaAddress(address)).send()).value;
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
  return;
}

const sourceAddress = process.argv.length > 2 ? process.argv[2] : undefined;

main(sourceAddress).catch(console.error);
