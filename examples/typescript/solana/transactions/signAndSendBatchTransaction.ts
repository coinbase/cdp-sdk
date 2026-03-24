// Usage: pnpm tsx solana/transactions/signAndSendBatchTransaction.ts [sourceAddress]

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

/**
 * This script will:
 * 1. Either use a provided Solana address or create a new one
 * 2. If a new account is created, requests SOL from CDP faucet
 * 3. Signs a transaction with CDP to send SOL to a set of destination addresses
 * 4. Broadcasts the signed transaction
 *
 * @param {string} [sourceAddress] - The source address to use
 * @returns A promise that resolves when the transaction is confirmed
 */
async function main(sourceAddress?: string) {
  const cdp = new CdpClient();

  // Required: Destination addresses to batch send SOL to
  const destinationAddresses = [
    "ANVUJaJoVaJZELtV2AvRp7V5qPV1B84o29zAwDhPj1c2",
    "EeVPcnRE1mhcY85wAh3uPJG1uFiTNya9dCJjNUPABXzo",
    "4PkiqJkUvxr9P8C1UsMqGN8NJsUcep9GahDRLfmeu8UK",
  ];

  // Amount of lamports to send (default: 1000 = 0.000001 SOL)
  const lamportsToSend = 1000;

  try {
    const rpc = createSolanaRpc("https://api.devnet.solana.com");

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

      // Request SOL from faucet
      const faucetResp = await cdp.solana.requestFaucet({
        address: fromAddress,
        token: "sol",
      });
      console.log(
        "Successfully requested SOL from faucet:",
        faucetResp.signature
      );
    }

    // Wait until the address has balance
    let balance = 0n;
    let attempts = 0;
    const maxAttempts = 30;

    while (balance === 0n && attempts < maxAttempts) {
      balance = (await rpc.getBalance(solanaAddress(fromAddress)).send()).value;
      if (balance === 0n) {
        console.log("Waiting for funds...");
        await sleep(1000);
        attempts++;
      }
    }

    if (balance === 0n) {
      throw new Error("Account not funded after multiple attempts");
    }

    console.log(
      "Account funded with",
      Number(balance) / LAMPORTS_PER_SOL,
      "SOL"
    );

    if (balance < BigInt(lamportsToSend)) {
      throw new Error(
        `Insufficient balance: ${balance} lamports, need at least ${lamportsToSend} lamports`
      );
    }

    const {
      value: { blockhash, lastValidBlockHeight },
    } = await rpc.getLatestBlockhash().send();

    // Add instructions to transfer SOL to each destination address
    const instructions = destinationAddresses.map((destinationAddress) =>
      getTransferSolInstruction({
        source: createNoopSigner(solanaAddress(fromAddress)),
        destination: solanaAddress(destinationAddress),
        amount: BigInt(lamportsToSend),
      })
    );

    const txMsg = pipe(
      createTransactionMessage({ version: 0 }),
      (tx) => setTransactionMessageFeePayer(solanaAddress(fromAddress), tx),
      (tx) =>
        setTransactionMessageLifetimeUsingBlockhash(
          { blockhash, lastValidBlockHeight },
          tx
        ),
      (tx) => appendTransactionMessageInstructions(instructions, tx)
    );

    const serializedTx = getBase64EncodedWireTransaction(
      compileTransaction(txMsg)
    );
    console.log("Transaction serialized successfully");

    const signedTxResponse = await cdp.solana.signTransaction({
      address: fromAddress,
      transaction: serializedTx,
    });

    const signature = await rpc
      .sendTransaction(
        signedTxResponse.signature as Base64EncodedWireTransaction,
        { encoding: "base64" }
      )
      .send();
    console.log("Solana transaction hash:", signature);

    console.log("Waiting for transaction to be confirmed");
    await confirmTransaction(rpc, signature);

    console.log("Transaction confirmed: success");
    console.log(
      `Transaction explorer link: https://explorer.solana.com/tx/${signature}?cluster=devnet`
    );

    return {
      fromAddress,
      destinationAddresses,
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
  sig: Signature
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
    `Transaction ${sig} not confirmed after ${maxAttempts} attempts`
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

const sourceAddress = process.argv.length > 2 ? process.argv[2] : undefined;

main(sourceAddress).catch(console.error);
