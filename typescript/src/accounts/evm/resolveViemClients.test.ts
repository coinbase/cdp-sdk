import { describe, it, expect, vi, beforeEach } from "vitest";
import { base, baseSepolia, mainnet } from "viem/chains";

import { resolveViemClients } from "./resolveViemClients.js";

describe("resolveViemClients", () => {
  const mockAccount = {
    address: "0x1234567890123456789012345678901234567890",
    sign: vi.fn(),
    signMessage: vi.fn(),
    signTransaction: vi.fn(),
    signTypedData: vi.fn(),
  } as const;

  beforeEach(async () => {
    vi.clearAllMocks();
  });

  describe("with network identifiers", () => {
    it("should resolve 'base' network identifier correctly", async () => {
      const result = await resolveViemClients({
        networkOrNodeUrl: "base",
        account: mockAccount,
      });

      expect(result.chain).toBe(base);
      expect(result.publicClient.transport.url).toBe(base.rpcUrls.default.http[0]);
      expect(result.walletClient.transport.url).toBe(base.rpcUrls.default.http[0]);
    });

    it("should resolve 'base-sepolia' network identifier correctly", async () => {
      const result = await resolveViemClients({
        networkOrNodeUrl: "base-sepolia",
        account: mockAccount,
      });

      expect(result.chain).toBe(baseSepolia);
      expect(result.publicClient.transport.url).toBe(baseSepolia.rpcUrls.default.http[0]);
      expect(result.walletClient.transport.url).toBe(baseSepolia.rpcUrls.default.http[0]);
    });

    it("should resolve 'ethereum' network identifier correctly", async () => {
      const result = await resolveViemClients({
        networkOrNodeUrl: "ethereum",
        account: mockAccount,
      });

      expect(result.chain).toBe(mainnet);
      expect(result.publicClient.transport.url).toBe(mainnet.rpcUrls.default.http[0]);
      expect(result.walletClient.transport.url).toBe(mainnet.rpcUrls.default.http[0]);
    });
  });

  describe("with Node URLs", () => {
    it("should resolve Node URL to base chain correctly", async () => {
      const result = await resolveViemClients({
        networkOrNodeUrl: "https://mainnet.base.org",
        account: mockAccount,
      });

      expect(result.chain).toBe(base);
      expect(result.publicClient.transport.url).toBe("https://mainnet.base.org");
      expect(result.walletClient.transport.url).toBe("https://mainnet.base.org");
    });

    it("should resolve Node URL to base-sepolia chain correctly", async () => {
      const result = await resolveViemClients({
        networkOrNodeUrl: "https://sepolia.base.org",
        account: mockAccount,
      });

      expect(result.chain).toBe(baseSepolia);
      expect(result.publicClient.transport.url).toBe("https://sepolia.base.org");
      expect(result.walletClient.transport.url).toBe("https://sepolia.base.org");
    });

    it("should throw error for malformed URLs", async () => {
      await expect(
        resolveViemClients({
          networkOrNodeUrl: "not-a-url",
          account: mockAccount,
        }),
      ).rejects.toThrow("Invalid URL format: not-a-url");
    });

    it("should throw error for URLs without protocol", async () => {
      await expect(
        resolveViemClients({
          networkOrNodeUrl: "mainnet.base.org",
          account: mockAccount,
        }),
      ).rejects.toThrow("Invalid URL format: mainnet.base.org");
    });

    it("should throw error when getChainId fails", async () => {
      await expect(
        resolveViemClients({
          networkOrNodeUrl: "https://invalid-url.org",
          account: mockAccount,
        }),
      ).rejects.toThrow("Failed to resolve chain ID from Node URL: HTTP request failed");
    });
  });
});
