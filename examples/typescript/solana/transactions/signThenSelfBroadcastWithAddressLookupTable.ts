// Usage: pnpm tsx solana/transactions/signThenSelfBroadcastWithAddressLookupTable.ts [sourceAddress]
//
// Diagnostic for "signature returned but transaction never lands on devnet" seen with
// cdp.solana.sendTransaction on a v0+ALT transaction. This script instead uses
// cdp.solana.signTransaction to get a signed transaction from CDP, then broadcasts it ourselves
// directly to the public devnet RPC -- bypassing whatever RPC provider cdp-service's own
// SendTransaction call is configured to use. If this lands, the bug is specific to cdp-service's
// own broadcast path; if it doesn't, the problem is upstream of broadcast (e.g. signing).

import { CdpClient } from "@coinbase/cdp-sdk";
import "dotenv/config";

import {
  fetchAddressLookupTable,
  findAddressLookupTablePda,
  getCreateLookupTableInstruction,
  getExtendLookupTableInstruction,
} from "@solana-program/address-lookup-table";
import { getTransferSolInstruction } from "@solana-program/system";
import {
  address as solanaAddress,
  appendTransactionMessageInstructions,
  Address,
  AddressesByLookupTableAddress,
  Base64EncodedWireTransaction,
  Blockhash,
  compileTransaction,
  compressTransactionMessageUsingAddressLookupTables,
  createNoopSigner,
  createSolanaRpc,
  createTransactionMessage,
  generateKeyPairSigner,
  getBase64EncodedWireTransaction,
  pipe,
  setTransactionMessageFeePayer,
  setTransactionMessageLifetimeUsingBlockhash,
  Signature,
} from "@solana/kit";

const LAMPORTS_PER_SOL = 1_000_000_000;
// A more recent blockhash is set in the backend by CDP for the create+extend send below.
const FAKE_BLOCKHASH = "SysvarRecentB1ockHashes11111111111111111111" as Blockhash;

/**
 * This script will:
 * 1. Either use a provided Solana address or create a new one, funded via the CDP faucet
 * 2. Create and extend a real address lookup table (ALT) on Solana Devnet (via
 *    cdp.solana.sendTransaction, same as the other ALT example, since this step has no ALT
 *    reference itself and isn't part of what we're isolating)
 * 3. Signs (not sends) a v0 transfer whose recipient is resolved only via that ALT, using
 *    cdp.solana.signTransaction, then broadcasts the signed bytes ourselves to public devnet
 *
 * @param {string} [sourceAddress] - The source address to use
 * @returns A promise that resolves when the self-broadcast transaction is confirmed
 */
async function main(sourceAddress?: string) {
  // Point at a non-prod endpoint when CDP_BASE_PATH is set (e.g. the dev API);
  // when it's unset the SDK falls back to the prod base path.
  const cdp = new CdpClient();
  const rpc = createSolanaRpc("https://api.devnet.solana.com");

  let fromAddress: string;
  if (sourceAddress) {
    fromAddress = sourceAddress;
    console.log("Using existing SOL account:", fromAddress);
  } else {
    const account = await cdp.solana.getOrCreateAccount({
      name: "test-sol-alt-sign-account",
    });

    fromAddress = account.address;
    console.log("Successfully created new SOL account:", fromAddress);

    const faucetResp = await cdp.solana.requestFaucet({
      address: fromAddress,
      token: "sol",
    });
    console.log("Successfully requested SOL from faucet:", faucetResp.signature);
  }

  await waitForBalance(rpc, fromAddress);

  const authority = createNoopSigner(solanaAddress(fromAddress));
  // A fresh, arbitrary pubkey that will only ever be reachable through the lookup table -- never
  // part of the transaction's static account keys.
  const recipient = await generateKeyPairSigner();

  const recentSlot = await rpc.getSlot({ commitment: "finalized" }).send();
  const [lookupTableAddress, lookupTableBump] = await findAddressLookupTablePda({
    authority: authority.address,
    recentSlot,
  });

  console.log("Creating and extending address lookup table:", lookupTableAddress);
  const createExtendSignature = await createAndExtendLookupTable({
    cdp,
    rpc,
    authority,
    lookupTableAddress,
    lookupTableBump,
    recentSlot,
    addresses: [recipient.address],
  });
  console.log("Create+extend transaction hash:", createExtendSignature);
  await confirmTransaction(rpc, createExtendSignature);

  // A lookup table can't be referenced in the same slot it was last extended; give devnet a
  // couple of slots (~400ms each) to move past that point before using it below.
  await sleep(2000);

  const lookupTable = await fetchAddressLookupTable(rpc, lookupTableAddress);
  console.log("Lookup table addresses:", lookupTable.data.addresses);

  const transferInstruction = getTransferSolInstruction({
    source: authority,
    destination: recipient.address,
    amount: 0n,
  });

  const { value: latestBlockhash } = await rpc
    .getLatestBlockhash({ commitment: "confirmed" })
    .send();

  const txMsg = pipe(
    createTransactionMessage({ version: 0 }),
    tx => setTransactionMessageFeePayer(authority.address, tx),
    tx => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
    tx => appendTransactionMessageInstructions([transferInstruction], tx),
  );

  const addressesByLookupTableAddress: AddressesByLookupTableAddress = {
    [lookupTableAddress]: lookupTable.data.addresses,
  };

  const compressedTxMsg = compressTransactionMessageUsingAddressLookupTables(
    txMsg,
    addressesByLookupTableAddress,
  );

  const unsignedTx = getBase64EncodedWireTransaction(compileTransaction(compressedTxMsg));

  const signStart = Date.now();
  const signedResult = await cdp.solana.signTransaction({
    address: fromAddress,
    transaction: unsignedTx,
    // Only required because this transaction references an ALT; ResolveAddressLookupTables
    // needs a network to resolve it for KYT/policy screening.
    network: "solana-devnet",
  });
  console.log(`signTransaction took ${Date.now() - signStart}ms`);

  console.log("Broadcasting CDP-signed transaction ourselves via public devnet RPC...");
  const broadcastSig = await rpc
    .sendTransaction(signedResult.signedTransaction as Base64EncodedWireTransaction, {
      encoding: "base64",
      maxRetries: 3n,
    })
    .send();
  console.log("Self-broadcast signature:", broadcastSig);

  console.log("Waiting for transaction to be confirmed");
  await confirmTransaction(rpc, broadcastSig);

  console.log("Transaction confirmed: success -- CDP signing + our own broadcast landed it.");
  console.log(
    `Transaction explorer link: https://explorer.solana.com/tx/${broadcastSig}?cluster=devnet`,
  );

  return {
    fromAddress,
    lookupTableAddress,
    recipient: recipient.address,
    createExtendSignature,
    broadcastSig,
    success: true,
  };
}

/**
 * Builds and sends the CreateLookupTable + ExtendLookupTable transaction via
 * cdp.solana.sendTransaction. No ALT reference here, so it's not part of what we're isolating.
 *
 * @param params - The parameters for creating and extending the lookup table.
 * @param params.cdp - The CDP client.
 * @param params.rpc - The Solana RPC client.
 * @param params.authority - The noop signer acting as authority and payer.
 * @param params.lookupTableAddress - The derived lookup table PDA address.
 * @param params.lookupTableBump - The bump seed for the derived lookup table PDA.
 * @param params.recentSlot - The recent slot used to derive the PDA.
 * @param params.addresses - The addresses to extend the lookup table with.
 * @returns The transaction signature.
 */
async function createAndExtendLookupTable(params: {
  cdp: CdpClient;
  rpc: ReturnType<typeof createSolanaRpc>;
  authority: ReturnType<typeof createNoopSigner>;
  lookupTableAddress: Awaited<ReturnType<typeof findAddressLookupTablePda>>[0];
  lookupTableBump: Awaited<ReturnType<typeof findAddressLookupTablePda>>[1];
  recentSlot: bigint;
  addresses: string[];
}): Promise<Signature> {
  const { cdp, authority, lookupTableAddress, lookupTableBump, recentSlot, addresses } = params;

  const createInstruction = getCreateLookupTableInstruction({
    address: [lookupTableAddress, lookupTableBump],
    authority,
    payer: authority,
    recentSlot,
  });

  const extendInstruction = getExtendLookupTableInstruction({
    address: lookupTableAddress,
    authority,
    payer: authority,
    addresses: addresses.map(a => solanaAddress(a)),
  });

  const txMsg = pipe(
    createTransactionMessage({ version: "legacy" }),
    tx => setTransactionMessageFeePayer(authority.address, tx),
    tx =>
      setTransactionMessageLifetimeUsingBlockhash(
        { blockhash: FAKE_BLOCKHASH, lastValidBlockHeight: 9999999n },
        tx,
      ),
    tx => appendTransactionMessageInstructions([createInstruction, extendInstruction], tx),
  );

  const serializedTx = getBase64EncodedWireTransaction(compileTransaction(txMsg));

  const result = await cdp.solana.sendTransaction({
    network: "solana-devnet",
    transaction: serializedTx,
  });

  return result.signature as Signature;
}

/**
 * Waits until the given address has a non-zero balance, requesting patience via polling.
 *
 * @param rpc - The Solana RPC client.
 * @param address - The address to check.
 * @returns A promise that resolves once the address is funded.
 */
async function waitForBalance(
  rpc: ReturnType<typeof createSolanaRpc>,
  address: string,
): Promise<void> {
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
}

async function confirmTransaction(
  rpcClient: ReturnType<typeof createSolanaRpc>,
  sig: string,
): Promise<void> {
  const maxAttempts = 30;
  for (let i = 0; i < maxAttempts; i++) {
    const result = await rpcClient.getSignatureStatuses([sig as Signature]).send();
    const status = result.value[0];
    if (
      status !== null &&
      (status.confirmationStatus === "confirmed" || status.confirmationStatus === "finalized")
    ) {
      if (status.err !== null) throw new Error(`Transaction failed: ${JSON.stringify(status.err)}`);
      return;
    }
    await sleep(1000);
  }
  throw new Error(`Transaction ${sig} not confirmed after ${maxAttempts} attempts`);
}

/**
 * Sleeps for a given number of milliseconds
 *
 * @param {number} ms - The number of milliseconds to sleep
 * @returns {Promise<void>} A promise that resolves when the sleep is complete
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const sourceAddress = process.argv.length > 2 ? process.argv[2] : undefined;

main(sourceAddress).catch(console.error);
