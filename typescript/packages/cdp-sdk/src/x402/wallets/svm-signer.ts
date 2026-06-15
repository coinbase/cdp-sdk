/**
 * Adapter to bridge CDP SDK Solana accounts to x402 SVM signers.
 */

import { address as toSolanaAddress, getTransactionEncoder } from "@solana/kit";

import type { SolanaAccount } from "../../accounts/solana/types.js";
import type { TransactionSigner } from "@solana/kit";

type ShortVecLength = {
  value: number;
  bytesRead: number;
};

/**
 *
 * @param bytes
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
/**
 *
 * @param transaction
 * @param signerAddress
 */
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
 * @param account - A CDP Solana account from CdpClient.solana.createAccount()
 * @returns A TransactionSigner compatible with @x402/svm's ExactSvmScheme
 */
export function cdpSolanaAccountToSvmSigner(account: SolanaAccount): TransactionSigner {
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

        results.push({
          [signerAddressKey]: signature,
        });
      }

      return results;
    },
  } as TransactionSigner;
}
