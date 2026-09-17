// Usage: pnpm tsx solana/transactions/sendTransactionWithAddressLookupTable.ts [sourceAddress]

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
// A more recent blockhash is set in the backend by CDP.
const FAKE_BLOCKHASH = "SysvarRecentB1ockHashes11111111111111111111" as Blockhash;

/**
 * This script will:
 * 1. Either use a provided Solana address or create a new one, funded via the CDP faucet
 * 2. Create and extend a real address lookup table (ALT) on Solana Devnet, with a fresh
 *    recipient address as its only entry
 * 3. Sends a transfer transaction whose recipient is referenced only through that ALT --
 *    never as a static account key -- to exercise server-side ALT resolution end to end
 *
 * @param {string} [sourceAddress] - The source address to use
 * @returns A promise that resolves when both transactions are confirmed
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
      name: "test-sol-alt-account",
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
  // A fresh, arbitrary pubkey that will only ever be reachable through the lookup table --
  // never part of a transaction's static account keys -- so sending through it proves
  // ALT-only accounts get resolved rather than silently dropped.
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

  const sendSignature = await sendTransactionViaLookupTable({
    cdp,
    authority,
    recipient: recipient.address,
    lookupTableAddress,
    lookupTableAddresses: lookupTable.data.addresses,
  });
  console.log("Send-via-ALT transaction hash:", sendSignature);

  console.log("Waiting for transaction to be confirmed");
  await confirmTransaction(rpc, sendSignature);

  console.log("Transaction confirmed: success");
  console.log(
    `Transaction explorer link: https://explorer.solana.com/tx/${sendSignature}?cluster=devnet`,
  );

  return {
    fromAddress,
    lookupTableAddress,
    recipient: recipient.address,
    createExtendSignature,
    sendSignature,
    success: true,
  };
}

/**
 * Builds and sends the CreateLookupTable + ExtendLookupTable transaction.
 *
 * @param params - The parameters for creating and extending the lookup table.
 * @param params.cdp - The CDP client.
 * @param params.rpc - The Solana RPC client.
 * @param params.authority - The noop signer acting as authority and payer.
 * @param params.lookupTableAddress - The derived lookup table PDA address.
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

  const start = Date.now();
  const result = await cdp.solana.sendTransaction({
    network: "solana-devnet",
    transaction: serializedTx,
  });
  console.log(`create+extend sendTransaction took ${Date.now() - start}ms`);

  return result.signature as Signature;
}

/**
 * Builds a v0 transfer whose recipient is resolved purely via the lookup table, and sends it.
 *
 * @param params - The parameters for sending the transaction.
 * @param params.cdp - The CDP client.
 * @param params.authority - The noop signer acting as fee payer and transfer source.
 * @param params.recipient - The ALT-only recipient address.
 * @param params.lookupTableAddress - The lookup table's address.
 * @param params.lookupTableAddresses - The addresses currently stored in the lookup table.
 * @returns The transaction signature.
 */
async function sendTransactionViaLookupTable(params: {
  cdp: CdpClient;
  authority: ReturnType<typeof createNoopSigner>;
  recipient: string;
  lookupTableAddress: string;
  lookupTableAddresses: Address[];
}): Promise<Signature> {
  const { cdp, authority, recipient, lookupTableAddress, lookupTableAddresses } = params;

  const transferInstruction = getTransferSolInstruction({
    source: authority,
    destination: solanaAddress(recipient),
    amount: 0n,
  });

  const txMsg = pipe(
    createTransactionMessage({ version: 0 }),
    tx => setTransactionMessageFeePayer(authority.address, tx),
    tx =>
      setTransactionMessageLifetimeUsingBlockhash(
        { blockhash: FAKE_BLOCKHASH, lastValidBlockHeight: 9999999n },
        tx,
      ),
    tx => appendTransactionMessageInstructions([transferInstruction], tx),
  );

  const addressesByLookupTableAddress: AddressesByLookupTableAddress = {
    [lookupTableAddress]: lookupTableAddresses,
  };

  const compressedTxMsg = compressTransactionMessageUsingAddressLookupTables(
    txMsg,
    addressesByLookupTableAddress,
  );

  const serializedTx = getBase64EncodedWireTransaction(compileTransaction(compressedTxMsg));

  const start = Date.now();
  const result = await cdp.solana.sendTransaction({
    network: "solana-devnet",
    transaction: serializedTx,
  });
  console.log(`send-via-ALT sendTransaction took ${Date.now() - start}ms`);

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
