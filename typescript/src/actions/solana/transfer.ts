import {
  getMint,
  getAssociatedTokenAddress,
  getAccount,
  createAssociatedTokenAccountInstruction,
  createTransferCheckedInstruction,
} from "@solana/spl-token";
import {
  Connection,
  PublicKey,
  SystemProgram,
  SYSVAR_RECENT_BLOCKHASHES_PUBKEY,
  Transaction,
} from "@solana/web3.js";

import { sendTransaction } from "./sendTransaction.js";
import {
  getConnectedNetwork,
  getOrCreateConnection,
  getUsdcMintAddress,
  type Network,
} from "./utils.js";

import type { SignatureResult } from "../../client/solana/solana.types.js";
import type { CdpOpenApiClientType } from "../../openapi-client/index.js";

export interface TransferOptions {
  /**
   * The base58 encoded Solana address of the source account.
   */
  from: string;
  /**
   * The base58 encoded Solana address of the destination account.
   */
  to: string;
  /**
   * The amount to transfer, represented as an atomic unit of the token.
   */
  amount: bigint;
  /**
   * The token to transfer, or mint address of the SPL token to transfer.
   */
  token: "sol" | "usdc" | string;
  /**
   * The network to use which will be used to create a Connection, otherwise a Connection can be provided.
   */
  network: Network | Connection;
}

/**
 * Transfers SOL or SPL tokens between accounts
 *
 * @param apiClient - The API client to use
 * @param options - The transfer options
 *
 * @returns The transfer result
 */
export async function transfer(
  apiClient: CdpOpenApiClientType,
  options: TransferOptions,
): Promise<SignatureResult> {
  const connection = getOrCreateConnection({ networkOrConnection: options.network });
  const connectedNetwork = await getConnectedNetwork(connection);

  const tx =
    options.token === "sol"
      ? await getNativeTransfer({
          from: options.from,
          to: options.to,
          amount: options.amount,
        })
      : await getSplTransfer({
          connection,
          from: options.from,
          to: options.to,
          mintAddress:
            options.token === "usdc" ? getUsdcMintAddress(connectedNetwork) : options.token,
          amount: options.amount,
        });

  const serializedTx = Buffer.from(tx.serialize({ requireAllSignatures: false })).toString(
    "base64",
  );

  const signature = await sendTransaction(apiClient, {
    network: connectedNetwork === "mainnet" ? "solana" : "solana-devnet",
    transaction: serializedTx,
  });

  return signature;
}

type GetNativeTransferOptions = Omit<TransferOptions, "token" | "network">;

/**
 * Gets the transaction for a native SOL transfer
 *
 * @param options - The options for the native SOL transfer
 *
 * @param options.from - The source address
 * @param options.to - The destination address
 * @param options.amount - The amount to transfer
 *
 * @returns The native SOL transfer transaction
 */
async function getNativeTransfer({
  from,
  to,
  amount,
}: GetNativeTransferOptions): Promise<Transaction> {
  const transaction = new Transaction();
  transaction.add(
    SystemProgram.transfer({
      fromPubkey: new PublicKey(from),
      toPubkey: new PublicKey(to),
      lamports: amount,
    }),
  );
  transaction.recentBlockhash = SYSVAR_RECENT_BLOCKHASHES_PUBKEY.toBase58();
  transaction.feePayer = new PublicKey(from);

  return transaction;
}

type GetSplTransferOptions = Omit<TransferOptions, "token" | "network"> & {
  /**
   * The mint address of the token
   */
  mintAddress: string;
  /**
   * The connection to the Solana network.
   */
  connection: Connection;
};

/**
 * Gets the transaction for a SPL token transfer
 *
 * @param options - The options for the SPL token transfer
 *
 * @param options.connection - The Solana connection
 * @param options.from - The source address
 * @param options.to - The destination address
 * @param options.mintAddress - The mint address of the token
 * @param options.amount - The amount to transfer
 *
 * @returns The SPL token transfer transaction
 */
async function getSplTransfer({
  connection,
  from,
  to,
  mintAddress,
  amount,
}: GetSplTransferOptions): Promise<Transaction> {
  const fromPubkey = new PublicKey(from);
  const toPubkey = new PublicKey(to);
  const mintPubkey = new PublicKey(mintAddress);

  let mintInfo: Awaited<ReturnType<typeof getMint>>;
  try {
    mintInfo = await getMint(connection, mintPubkey);
  } catch (error) {
    throw new Error(`Failed to fetch mint info for mint address ${mintAddress}. Error: ${error}`);
  }

  const sourceAta = await getAssociatedTokenAddress(mintPubkey, fromPubkey);
  const destinationAta = await getAssociatedTokenAddress(mintPubkey, toPubkey);

  const transaction = new Transaction();

  const sourceAccount = await getAccount(connection, sourceAta);
  if (sourceAccount.amount < amount) {
    throw new Error(`Insufficient token balance. Have ${sourceAccount.amount}, need ${amount}`);
  }

  // Check if destination account exists, if not create it
  try {
    await getAccount(connection, destinationAta);
  } catch {
    transaction.add(
      createAssociatedTokenAccountInstruction(fromPubkey, destinationAta, toPubkey, mintPubkey),
    );
  }

  transaction.add(
    createTransferCheckedInstruction(
      sourceAta,
      mintPubkey,
      destinationAta,
      fromPubkey,
      amount,
      mintInfo.decimals,
    ),
  );
  transaction.recentBlockhash = SYSVAR_RECENT_BLOCKHASHES_PUBKEY.toBase58();
  transaction.feePayer = new PublicKey(from);

  return transaction;
}
