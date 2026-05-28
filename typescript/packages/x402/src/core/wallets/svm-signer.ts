/**
 * Adapter to bridge CDP SDK Solana accounts to x402 SVM signers.
 *
 * The CDP SDK's SolanaAccount does not directly implement @solana/kit's
 * TransactionPartialSigner interface. This module provides an adapter that
 * translates between the two interfaces.
 */

import type { TransactionSigner } from "@solana/kit";
import { address as toSolanaAddress, getTransactionEncoder } from "@solana/kit";

/**
 * Minimal interface for a CDP Solana account.
 * Matches the relevant methods from @coinbase/cdp-sdk's SolanaAccount.
 */
export interface CdpSolanaAccount {
  address: string;
  signTransaction(options: { transaction: string }): Promise<{ signedTransaction: string }>;
}

type ShortVecLength = {
  value: number;
  bytesRead: number;
};

function decodeShortVecLength(bytes: Uint8Array): ShortVecLength {
  let value = 0;
  let shift = 0;
  let bytesRead = 0;

  // Solana shortvec uses a little-endian base-128 varint.
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
 * Converts a CDP Solana account into an x402-compatible TransactionSigner.
 *
 * The adapter handles the translation between:
 * - CDP's base64-encoded transaction strings
 * - @solana/kit's compiled transaction objects with signature dictionaries
 *
 * @param account - A CDP Solana account from CdpClient.solana.createAccount()
 * @returns A TransactionSigner compatible with @x402/svm's ExactSvmScheme
 */
export function cdpSolanaAccountToSvmSigner(account: CdpSolanaAccount): TransactionSigner {
  const signerAddress = toSolanaAddress(account.address);
  const signerAddressKey = signerAddress as string;
  const encoder = getTransactionEncoder();

  // Build a TransactionPartialSigner-compatible object.
  // We use `as TransactionSigner` because the @solana/kit types use branded/nominal
  // types (Address, SignatureBytes) that require explicit casting from plain values.
  return {
    address: signerAddress,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async signTransactions(transactions: readonly any[]): Promise<readonly any[]> {
      const results = [];

      for (const transaction of transactions) {
        const signerIndex = resolveSignerIndex(transaction, signerAddressKey);

        // Encode the compiled transaction to wire format bytes
        const encodedBytes = encoder.encode(transaction);
        const base64Transaction = Buffer.from(encodedBytes).toString("base64");

        // Sign via CDP API
        const { signedTransaction } = await account.signTransaction({
          transaction: base64Transaction,
        });

        // Decode the signed transaction to extract signatures
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

        results.push({
          [signerAddressKey]: signature,
        });
      }

      return results;
    },
  } as TransactionSigner;
}
