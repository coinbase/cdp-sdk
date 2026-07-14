/*
 * Pure CDP-account-to-x402-signer adapters.
 */
import { address as toSolanaAddress, getTransactionEncoder } from "@solana/kit";
import { toClientEvmSigner } from "@x402/evm";

import { CHAIN_ID_TO_CDP_NETWORK } from "./constants.js";

import type { EvmAccount } from "../accounts/evm/types.js";
import type { SignTypedDataOptions } from "../client/evm/evm.types.js";
import type { TransactionSigner } from "@solana/kit";
import type { ClientEvmSigner } from "@x402/evm";
import type { Address, Hex } from "viem";

/**
 * The subset of a CDP EVM server account (EOA) required to sign x402 payments.
 * Derived from the SDK's {@link EvmAccount} type so the adapter stays in sync
 * with the real account surface.
 */
export type CdpEvmAccount = Pick<EvmAccount, "address" | "signTypedData">;

/**
 * Converts a CDP EVM server account (EOA) into an x402-compatible signer.
 *
 * @param account - A CDP EVM account from `cdpClient.evm.getOrCreateAccount()`
 * @returns A `ClientEvmSigner` compatible with `@x402/evm`'s `registerExactEvmScheme`
 */
export function fromCdpEvmAccount(account: CdpEvmAccount): ClientEvmSigner {
  return toClientEvmSigner(account);
}

// ─── Smart Contract Wallet Adapter ────────────────────────────────────────────

/**
 * The subset of a CDP Smart Account (EvmSmartAccount) required to sign x402
 * payments. Its `signTypedData` mirrors the SDK smart-account signature, which
 * requires a `network` derived from the EIP-712 domain's `chainId`.
 */
export interface CdpSmartAccount {
  address: Address;
  signTypedData(options: Omit<SignTypedDataOptions, "address"> & { network: string }): Promise<Hex>;
}

/**
 * Resolves a CDP SDK network name from an EIP-712 domain chain ID.
 *
 * @param chainId - The EIP-712 domain chain ID to resolve.
 * @throws {Error} If the chain ID is undefined or not supported.
 * @returns The CDP SDK network name (e.g. `"base-sepolia"`).
 */
export function resolveNetworkFromChainId(chainId: number | undefined): string {
  if (chainId === undefined) {
    throw new Error(
      "Cannot derive CDP network: domain.chainId is missing from the typed data. " +
        "EIP-712 domain must include chainId when using a Smart Contract Wallet.",
    );
  }
  const network = CHAIN_ID_TO_CDP_NETWORK[chainId];
  if (!network) {
    throw new Error(
      `Unsupported chainId ${chainId} for CDP Smart Contract Wallet. ` +
        `Supported networks: ${Object.values(CHAIN_ID_TO_CDP_NETWORK).join(", ")}`,
    );
  }
  return network;
}

/**
 * Converts a CDP Smart Account (EvmSmartAccount) into an x402-compatible signer.
 *
 * CDP Smart Accounts differ from EOAs in that their `signTypedData` requires a
 * `network` parameter. This adapter derives the network automatically from the
 * EIP-712 domain's `chainId`.
 *
 * @param account - A CDP Smart Account from `cdpClient.evm.getOrCreateSmartAccount()`
 * @returns A `ClientEvmSigner` compatible with `@x402/evm`'s `registerExactEvmScheme`
 */
export function fromCdpSmartWallet(account: CdpSmartAccount): ClientEvmSigner {
  const signerShape = {
    address: account.address,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async signTypedData({ domain, types, primaryType, message }: any): Promise<Hex> {
      const chainId = domain?.chainId as number | undefined;
      const network = resolveNetworkFromChainId(chainId);
      return account.signTypedData({ domain, types, primaryType, message, network });
    },
  };
  return toClientEvmSigner(signerShape);
}

// ─── Solana Account Adapter ───────────────────────────────────────────────────

/**
 * Minimal interface for a CDP Solana account.
 * Matches the relevant methods from CdpClient's SolanaAccount.
 */
export interface CdpSolanaAccount {
  address: string;
  signTransaction(options: { transaction: string }): Promise<{ signedTransaction: string }>;
}

type ShortVecLength = {
  value: number;
  bytesRead: number;
};

/**
 * Decodes a Solana short-vector length prefix from the start of a byte array.
 *
 * @param bytes - Raw transaction bytes to decode.
 * @returns Decoded length value and number of bytes consumed.
 */
function decodeShortVecLength(bytes: Uint8Array): ShortVecLength {
  let value = 0;
  let shift = 0;
  let bytesRead = 0;
  while (bytesRead < bytes.length) {
    const byte = bytes[bytesRead]!;
    value |= (byte & 0x7f) << shift;
    bytesRead += 1;
    if ((byte & 0x80) === 0) {
      return { value, bytesRead };
    }
    shift += 7;
  }
  throw new Error("Invalid Solana transaction wire format: truncated shortvec length.");
}

/**
 * Finds the index of a signer in a compiled Solana transaction's signatures map.
 *
 * @param transaction - Compiled Solana transaction object.
 * @param signerAddress - Base58 signer address to locate.
 * @returns The zero-based index of the signer in the signatures array.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function resolveSignerIndex(transaction: any, signerAddress: string): number {
  const signatures = transaction?.signatures;
  if (signatures && typeof signatures === "object") {
    const signerOrder = Object.keys(signatures);
    const index = signerOrder.indexOf(signerAddress);
    if (index >= 0) return index;
  }
  throw new Error(
    `Unable to locate signer "${signerAddress}" in transaction signatures. ` +
      "Expected transaction.signatures to contain the signer address.",
  );
}

/**
 * Converts a CDP Solana account into an x402-compatible `TransactionSigner`.
 *
 * Handles the translation between CDP's base64-encoded transaction strings and
 * `@solana/kit`'s compiled transaction objects.
 *
 * @param account - A CDP Solana account from `cdpClient.solana.getOrCreateAccount()`
 * @returns A `TransactionSigner` compatible with `@x402/svm`'s `registerExactSvmScheme`
 */
export function cdpSolanaAccountToSvmSigner(account: CdpSolanaAccount): TransactionSigner {
  const signerAddress = toSolanaAddress(account.address);
  const signerAddressKey = signerAddress as string;
  const encoder = getTransactionEncoder();

  return {
    address: signerAddress,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async signTransactions(transactions: readonly any[]): Promise<readonly any[]> {
      const results = [];
      for (const transaction of transactions) {
        const signerIndex = resolveSignerIndex(transaction, signerAddressKey);
        const encodedBytes = encoder.encode(transaction);
        const base64Transaction = Buffer.from(encodedBytes).toString("base64");
        const { signedTransaction } = await account.signTransaction({
          transaction: base64Transaction,
        });
        const signedBytes = Buffer.from(signedTransaction, "base64");
        const { value: signatureCount, bytesRead: signatureSectionOffset } =
          decodeShortVecLength(signedBytes);
        if (signerIndex >= signatureCount) {
          throw new Error(
            `Signer index ${signerIndex} is out of bounds for ${signatureCount} signatures.`,
          );
        }
        const signatureOffset = signatureSectionOffset + signerIndex * 64;
        const signatureEnd = signatureOffset + 64;
        if (signatureEnd > signedBytes.length) {
          throw new Error(
            "Invalid Solana transaction wire format: signed transaction is missing signature bytes.",
          );
        }
        const signature = new Uint8Array(signedBytes.slice(signatureOffset, signatureEnd));
        results.push({ [signerAddressKey]: signature });
      }
      return results;
    },
  } as TransactionSigner;
}
