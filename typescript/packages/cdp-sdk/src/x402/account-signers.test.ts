import bs58 from "bs58";

import { getTransactionEncoder } from "@solana/kit";
import { describe, expect, it, vi } from "vitest";

import {
  cdpSolanaAccountToMessageSigner,
  cdpSolanaAccountToSvmSigner,
  resolveNetworkFromChainId,
} from "./account-signers.js";

import type { CdpSolanaAccount, CdpSolanaMessageSigningAccount } from "./account-signers.js";
import type { SignableMessage } from "@solana/kit";

/**
 * Narrows the SVM signer (a `TransactionSigner` union) to the partial-signer
 * shape the CDP adapter actually returns, so tests can call `signTransactions`.
 */
type SvmPartialSigner = {
  signTransactions: (
    transactions: readonly unknown[],
  ) => Promise<readonly Record<string, Uint8Array>[]>;
};

/**
 * Builds the CDP SVM signer and narrows it for assertions.
 *
 * @param account - The CDP Solana account stub.
 * @returns The signer narrowed to its partial-signer shape.
 */
function toSvmPartialSigner(account: CdpSolanaAccount): SvmPartialSigner {
  return cdpSolanaAccountToSvmSigner(account) as unknown as SvmPartialSigner;
}

// Valid base58 Solana addresses (so `address()` from @solana/kit accepts them).
const SIGNER_ADDRESS = "So11111111111111111111111111111111111111112";
const OTHER_ADDRESS = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";

const MESSAGE_BYTES = new Uint8Array([1, 2, 3, 4, 5]);

/**
 * Encodes a transaction into the Solana wire format using the same encoder the
 * adapter uses, so tests exercise the real shortvec + signature layout.
 *
 * @param signatures - Ordered map of signer address to signature (or null when unsigned).
 * @returns Base64-encoded signed transaction string, as CDP would return it.
 */
function encodeSignedTransaction(signatures: Record<string, Uint8Array | null>): string {
  const encoded = getTransactionEncoder().encode({
    messageBytes: MESSAGE_BYTES as never,
    signatures: signatures as never,
  });
  return Buffer.from(encoded).toString("base64");
}

describe("resolveNetworkFromChainId", () => {
  it("resolves world mainnet and world sepolia chain IDs", () => {
    expect(resolveNetworkFromChainId(480)).toBe("world");
    expect(resolveNetworkFromChainId(4801)).toBe("world-sepolia");
  });
});

describe("cdpSolanaAccountToSvmSigner", () => {
  it("extracts the signer's signature from a CDP-signed transaction at a non-zero index", async () => {
    const knownSignature = new Uint8Array(64).fill(7);
    const signedTransaction = encodeSignedTransaction({
      [OTHER_ADDRESS]: null,
      [SIGNER_ADDRESS]: knownSignature,
    });
    const signTransaction = vi.fn().mockResolvedValue({ signedTransaction });
    const account = { address: SIGNER_ADDRESS, signTransaction };

    const signer = toSvmPartialSigner(account);
    const [signatureDictionary] = await signer.signTransactions([
      {
        messageBytes: MESSAGE_BYTES as never,
        signatures: { [OTHER_ADDRESS]: null, [SIGNER_ADDRESS]: null } as never,
      },
    ]);

    expect(new Uint8Array(signatureDictionary[SIGNER_ADDRESS])).toEqual(knownSignature);
  });

  it("sends the re-encoded unsigned transaction to CDP for signing", async () => {
    const unsignedSignatures = { [OTHER_ADDRESS]: null, [SIGNER_ADDRESS]: null };
    const expectedBase64 = encodeSignedTransaction(unsignedSignatures);
    const signTransaction = vi.fn().mockResolvedValue({
      signedTransaction: encodeSignedTransaction({
        [OTHER_ADDRESS]: null,
        [SIGNER_ADDRESS]: new Uint8Array(64).fill(9),
      }),
    });
    const account = { address: SIGNER_ADDRESS, signTransaction };

    const signer = toSvmPartialSigner(account);
    await signer.signTransactions([
      { messageBytes: MESSAGE_BYTES as never, signatures: unsignedSignatures as never },
    ]);

    expect(signTransaction).toHaveBeenCalledWith({ transaction: expectedBase64 });
  });

  it("throws when the signer is not present in the transaction signatures", async () => {
    const signTransaction = vi.fn();
    const account = { address: SIGNER_ADDRESS, signTransaction };

    const signer = toSvmPartialSigner(account);

    await expect(
      signer.signTransactions([
        { messageBytes: MESSAGE_BYTES as never, signatures: { [OTHER_ADDRESS]: null } as never },
      ]),
    ).rejects.toThrow(`Unable to locate signer "${SIGNER_ADDRESS}"`);
    expect(signTransaction).not.toHaveBeenCalled();
  });

  it("throws when the signed transaction has fewer signatures than the signer index", async () => {
    // Signer is at index 1 in the input, but CDP returns a single-signature transaction.
    const signedTransaction = encodeSignedTransaction({
      [OTHER_ADDRESS]: new Uint8Array(64).fill(1),
    });
    const signTransaction = vi.fn().mockResolvedValue({ signedTransaction });
    const account = { address: SIGNER_ADDRESS, signTransaction };

    const signer = toSvmPartialSigner(account);

    await expect(
      signer.signTransactions([
        {
          messageBytes: MESSAGE_BYTES as never,
          signatures: { [OTHER_ADDRESS]: null, [SIGNER_ADDRESS]: null } as never,
        },
      ]),
    ).rejects.toThrow("is out of bounds for 1 signatures");
  });
});

describe("cdpSolanaAccountToMessageSigner", () => {
  /**
   * Builds a `SignableMessage` from raw content bytes, matching the shape
   * `@x402/svm`'s `UptoSvmScheme` server passes to `signMessages`.
   *
   * @param content - Raw message bytes to sign.
   * @returns A `SignableMessage` with empty existing signatures.
   */
  function toSignableMessage(content: Uint8Array): SignableMessage {
    return { content, signatures: {} } as SignableMessage;
  }

  it("exposes the account's address as a validated Solana Address", () => {
    const account: CdpSolanaMessageSigningAccount = {
      address: SIGNER_ADDRESS,
      signMessage: vi.fn(),
    };

    const signer = cdpSolanaAccountToMessageSigner(account);

    expect(signer.address).toBe(SIGNER_ADDRESS);
  });

  it("base64-encodes the message content before calling account.signMessage", async () => {
    const knownSignature = bs58.encode(new Uint8Array(64).fill(7));
    const signMessage = vi.fn().mockResolvedValue({ signature: knownSignature });
    const account: CdpSolanaMessageSigningAccount = { address: SIGNER_ADDRESS, signMessage };

    const signer = cdpSolanaAccountToMessageSigner(account);
    await signer.signMessages([toSignableMessage(MESSAGE_BYTES)]);

    expect(signMessage).toHaveBeenCalledWith({
      message: Buffer.from(MESSAGE_BYTES).toString("base64"),
    });
  });

  it("base58-decodes the returned signature into a SignatureDictionary keyed by the signer's address", async () => {
    const knownSignatureBytes = new Uint8Array(64).fill(9);
    const signMessage = vi.fn().mockResolvedValue({ signature: bs58.encode(knownSignatureBytes) });
    const account: CdpSolanaMessageSigningAccount = { address: SIGNER_ADDRESS, signMessage };

    const signer = cdpSolanaAccountToMessageSigner(account);
    const [signatureDictionary] = await signer.signMessages([toSignableMessage(MESSAGE_BYTES)]);

    expect(new Uint8Array(signatureDictionary![SIGNER_ADDRESS]!)).toEqual(knownSignatureBytes);
  });

  it("returns one signature dictionary per input message, signing each independently", async () => {
    const signatureA = new Uint8Array(64).fill(1);
    const signatureB = new Uint8Array(64).fill(2);
    const signMessage = vi
      .fn()
      .mockResolvedValueOnce({ signature: bs58.encode(signatureA) })
      .mockResolvedValueOnce({ signature: bs58.encode(signatureB) });
    const account: CdpSolanaMessageSigningAccount = { address: SIGNER_ADDRESS, signMessage };

    const signer = cdpSolanaAccountToMessageSigner(account);
    const results = await signer.signMessages([
      toSignableMessage(new Uint8Array([1, 2, 3])),
      toSignableMessage(new Uint8Array([4, 5, 6])),
    ]);

    expect(results).toHaveLength(2);
    expect(new Uint8Array(results[0]![SIGNER_ADDRESS]!)).toEqual(signatureA);
    expect(new Uint8Array(results[1]![SIGNER_ADDRESS]!)).toEqual(signatureB);
    expect(signMessage).toHaveBeenCalledTimes(2);
  });
});
