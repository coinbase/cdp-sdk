import { describe, it, expect, vi } from "vitest";
import {
  cdpSolanaAccountToSvmSigner,
  type CdpSolanaAccount,
} from "../../../src/core/wallets/svm-signer.js";

// Mock @solana/kit
vi.mock("@solana/kit", () => ({
  address: (addr: string) => addr,
  getTransactionEncoder: () => ({
    encode: (tx: unknown) => {
      const sigCount = (tx as { _signatureCount?: number })._signatureCount ?? 1;
      // Return a mock wire-format transaction
      // Real format: compact-u16 sig count + 64-byte sigs + message
      // For testing: 1 sig slot (zeroed) + minimal message
      const buf = new Uint8Array(1 + sigCount * 64 + 10);
      buf[0] = sigCount;
      // signatures are zeroed (unsigned)
      // rest is mock message bytes
      return buf;
    },
  }),
}));

describe("signer", () => {
  describe("cdpSolanaAccountToSvmSigner", () => {
    function createMockCdpSolanaAccount(): CdpSolanaAccount {
      return {
        address: "7nYT1Dv9QfMsQHcZJbNyA9JkHqoVrpLmkCFfBjDqkbu",
        signTransaction: vi.fn().mockImplementation(async ({ transaction }) => {
          // Simulate signing: decode base64, fill in a signature, re-encode
          const bytes = Buffer.from(transaction, "base64");
          const sigCount = bytes[0]!;
          for (let slot = 0; slot < sigCount; slot++) {
            const signatureValue = 0xab + slot;
            const start = 1 + slot * 64;
            for (let i = start; i < start + 64; i++) {
              bytes[i] = signatureValue;
            }
          }
          return { signedTransaction: bytes.toString("base64") };
        }),
      };
    }

    it("creates a signer with the correct address", () => {
      const account = createMockCdpSolanaAccount();
      const signer = cdpSolanaAccountToSvmSigner(account);

      expect(signer.address).toBe("7nYT1Dv9QfMsQHcZJbNyA9JkHqoVrpLmkCFfBjDqkbu");
    });

    it("has a signTransactions method", () => {
      const account = createMockCdpSolanaAccount();
      const signer = cdpSolanaAccountToSvmSigner(account);

      expect(typeof signer.signTransactions).toBe("function");
    });

    it("calls CDP signTransaction for each transaction", async () => {
      const account = createMockCdpSolanaAccount();
      const signer = cdpSolanaAccountToSvmSigner(account);

      // Create mock transactions (the encoder mock will handle them)
      const mockTransactions = [
        { signatures: { "7nYT1Dv9QfMsQHcZJbNyA9JkHqoVrpLmkCFfBjDqkbu": null } },
        { signatures: { "7nYT1Dv9QfMsQHcZJbNyA9JkHqoVrpLmkCFfBjDqkbu": null } },
      ] as Parameters<typeof signer.signTransactions>[0];

      const results = await signer.signTransactions(mockTransactions);

      expect(account.signTransaction).toHaveBeenCalledTimes(2);
      expect(results).toHaveLength(2);
    });

    it("returns signature dictionaries keyed by signer address", async () => {
      const account = createMockCdpSolanaAccount();
      const signer = cdpSolanaAccountToSvmSigner(account);

      const mockTransactions = [
        { signatures: { "7nYT1Dv9QfMsQHcZJbNyA9JkHqoVrpLmkCFfBjDqkbu": null } },
      ] as Parameters<typeof signer.signTransactions>[0];

      const results = await signer.signTransactions(mockTransactions);

      expect(results[0]).toHaveProperty("7nYT1Dv9QfMsQHcZJbNyA9JkHqoVrpLmkCFfBjDqkbu");
    });

    it("extracts 64-byte signature from signed transaction", async () => {
      const account = createMockCdpSolanaAccount();
      const signer = cdpSolanaAccountToSvmSigner(account);

      const mockTransactions = [
        { signatures: { "7nYT1Dv9QfMsQHcZJbNyA9JkHqoVrpLmkCFfBjDqkbu": null } },
      ] as Parameters<typeof signer.signTransactions>[0];

      const results = await signer.signTransactions(mockTransactions);
      const sigDict = results[0];
      const signature = sigDict["7nYT1Dv9QfMsQHcZJbNyA9JkHqoVrpLmkCFfBjDqkbu"];

      expect(signature).toBeInstanceOf(Uint8Array);
      expect(signature).toHaveLength(64);
      // Verify all bytes are 0xAB (our mock signature)
      for (const byte of signature) {
        expect(byte).toBe(0xab);
      }
    });

    it("extracts the signature for the signer index, not always the first slot", async () => {
      const account = createMockCdpSolanaAccount();
      const signer = cdpSolanaAccountToSvmSigner(account);
      const signerAddress = "7nYT1Dv9QfMsQHcZJbNyA9JkHqoVrpLmkCFfBjDqkbu";
      const otherSigner = "9gQf6BC6p9WmWc4aE7mtr4v4btkWxppWKqhzyap5bQAA";

      const mockTransactions = [
        {
          _signatureCount: 2,
          signatures: {
            [otherSigner]: null,
            [signerAddress]: null,
          },
        },
      ] as Parameters<typeof signer.signTransactions>[0];

      const results = await signer.signTransactions(mockTransactions);
      const signature = results[0]?.[signerAddress];
      expect(signature).toBeDefined();
      expect(signature).toHaveLength(64);
      // Slot 1 is filled with 0xAC in our mock signer.
      for (const byte of signature) {
        expect(byte).toBe(0xac);
      }
    });

    it("throws when signer address is absent from transaction signatures", async () => {
      const account = createMockCdpSolanaAccount();
      const signer = cdpSolanaAccountToSvmSigner(account);

      const mockTransactions = [
        { signatures: { "9gQf6BC6p9WmWc4aE7mtr4v4btkWxppWKqhzyap5bQAA": null } },
      ] as Parameters<typeof signer.signTransactions>[0];

      await expect(signer.signTransactions(mockTransactions)).rejects.toThrow(
        "Unable to locate signer",
      );
    });

    it("passes base64-encoded transaction to CDP API", async () => {
      const account = createMockCdpSolanaAccount();
      const signer = cdpSolanaAccountToSvmSigner(account);

      const mockTransactions = [
        { signatures: { "7nYT1Dv9QfMsQHcZJbNyA9JkHqoVrpLmkCFfBjDqkbu": null } },
      ] as Parameters<typeof signer.signTransactions>[0];

      await signer.signTransactions(mockTransactions);

      const call = (account.signTransaction as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(call).toHaveProperty("transaction");
      // Should be a valid base64 string
      expect(() => Buffer.from(call.transaction, "base64")).not.toThrow();
    });
  });
});
