import {
  pipe,
  createTransactionMessage,
  setTransactionMessageLifetimeUsingBlockhash,
  appendTransactionMessageInstructions,
  Instruction,
  createSolanaRpc,
  address,
  compileTransaction,
  setTransactionMessageFeePayer,
  createNoopSigner,
  getBase64EncodedWireTransaction,
} from "@solana/kit";
import { Connection } from "@solana/web3.js";
import { getTransferSolInstruction } from "@solana-program/system";
import {
  findAssociatedTokenPda,
  getCreateAssociatedTokenInstructionAsync,
  getTransferCheckedInstruction,
  fetchToken,
  fetchMint,
  TOKEN_PROGRAM_ADDRESS,
} from "@solana-program/token";

import { createRpcClient } from "./rpc.js";
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
   * The network to use which will be used to create an RPC client, otherwise an RPC client can be provided.
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
  const rpc = createRpcClient(connectedNetwork);

  const base64Transaction =
    options.token === "sol"
      ? await getNativeTransferBase64Transaction({
          rpc,
          from: options.from,
          to: options.to,
          amount: options.amount,
        })
      : await getSplTransferBase64Transaction({
          rpc,
          from: options.from,
          to: options.to,
          mintAddress:
            options.token === "usdc" ? getUsdcMintAddress(connectedNetwork) : options.token,
          amount: options.amount,
        });

  const signature = await sendTransaction(apiClient, {
    network: connectedNetwork === "mainnet" ? "solana" : "solana-devnet",
    transaction: base64Transaction,
  });

  return signature;
}

type GetNativeTransferOptions = Omit<TransferOptions, "token" | "network"> & {
  rpc: ReturnType<typeof createSolanaRpc>;
};

/**
 * Gets the transaction for a SOL transfer
 *
 * @param options - The options for the SOL transfer
 *
 * @param options.rpc - The Solana RPC client
 * @param options.from - The source address
 * @param options.to - The destination address
 * @param options.amount - The amount in lamports to transfer
 *
 * @returns The SOL transfer transaction
 */
export async function getNativeTransferBase64Transaction({
  rpc,
  from,
  to,
  amount,
}: GetNativeTransferOptions): Promise<string> {
  const fromAddr = address(from);
  const toAddr = address(to);

  const instructions: Instruction[] = [
    getTransferSolInstruction({
      source: createNoopSigner(fromAddr),
      destination: toAddr,
      amount,
    }),
  ];

  const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();

  const txMsg = pipe(
    createTransactionMessage({ version: 0 }),
    tx => setTransactionMessageFeePayer(fromAddr, tx),
    tx => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
    tx => appendTransactionMessageInstructions(instructions, tx),
  );

  const compiledTransaction = compileTransaction(txMsg);
  return getBase64EncodedWireTransaction(compiledTransaction);
}

type GetSplTokenTransferOptions = Omit<TransferOptions, "network" | "token"> & {
  mintAddress: string;
  rpc: ReturnType<typeof createSolanaRpc>;
};

/**
 * Gets the transaction for a SPL token transfer
 *
 * @param options - The options for the SPL token transfer
 *
 * @param options.rpc - The Solana RPC client
 * @param options.from - The source address
 * @param options.to - The destination address
 * @param options.mintAddress - The mint address of the token
 * @param options.amount - The amount in units of the token to transfer
 *
 * @returns The SPL token transfer transaction
 */
export async function getSplTransferBase64Transaction({
  rpc,
  from,
  to,
  mintAddress,
  amount,
}: GetSplTokenTransferOptions): Promise<string> {
  const fromAddr = address(from);
  const toAddr = address(to);
  const mintAddr = address(mintAddress);

  const mintInfo = await fetchMint(rpc, mintAddr);

  const [sourceAta] = await findAssociatedTokenPda({
    mint: mintAddr,
    owner: fromAddr,
    tokenProgram: TOKEN_PROGRAM_ADDRESS,
  });
  const [destAta] = await findAssociatedTokenPda({
    mint: mintAddr,
    owner: toAddr,
    tokenProgram: TOKEN_PROGRAM_ADDRESS,
  });

  const sourceAcct = await fetchToken(rpc, sourceAta);
  if (sourceAcct.data.amount < amount) {
    throw new Error(`Insufficient token balance: have ${sourceAcct.data.amount}, need ${amount}`);
  }

  const instructions: Instruction[] = [];

  // If destination ATA does not exist, add create instruction
  try {
    await fetchToken(rpc, destAta);
  } catch {
    const createDestIx = await getCreateAssociatedTokenInstructionAsync({
      payer: createNoopSigner(fromAddr),
      owner: toAddr,
      ata: destAta,
      mint: mintAddr,
    });
    instructions.push(createDestIx);
  }

  instructions.push(
    getTransferCheckedInstruction({
      source: sourceAta,
      mint: mintAddr,
      destination: destAta,
      authority: fromAddr,
      amount,
      decimals: mintInfo.data.decimals,
    }),
  );

  const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();

  const txMsg = pipe(
    createTransactionMessage({ version: 0 }),
    tx => setTransactionMessageFeePayer(fromAddr, tx),
    tx => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
    tx => appendTransactionMessageInstructions(instructions, tx),
  );

  const compiledTransaction = compileTransaction(txMsg);
  return getBase64EncodedWireTransaction(compiledTransaction);
}
