import { describe, it, expect, vi, beforeEach } from "vitest";
import { resolveViemClients } from "./resolveViemClients.js";
import { base, baseSepolia, mainnet, sepolia } from "viem/chains";

// Mock viem's createPublicClient, createWalletClient, and http
vi.mock("viem", async () => {
  const actual = await vi.importActual("viem");
  return {
    ...actual,
    createPublicClient: vi.fn(),
    createWalletClient: vi.fn(),
    http: vi.fn(),
  };
});

// Mock viem/chains
vi.mock("viem/chains", async () => {
  const actual = await vi.importActual("viem/chains");
  return {
    ...actual,
  };
});

describe("resolveViemClients", () => {
  const mockPublicClient = {
    getChainId: vi.fn(),
  };
  
  const mockWalletClient = {};
  const mockHttp = vi.fn();
  const mockAccount = "0x1234567890123456789012345678901234567890" as const;
  
  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Reset the mock implementations
    const { createPublicClient, createWalletClient, http } = await import("viem");
    vi.mocked(createPublicClient).mockReturnValue(mockPublicClient as any);
    vi.mocked(createWalletClient).mockReturnValue(mockWalletClient as any);
    vi.mocked(http).mockReturnValue(mockHttp);
  });

  describe("with network identifiers", () => {
    it("should resolve 'base' network identifier correctly", async () => {
      const result = await resolveViemClients({
        networkOrNodeUrl: "base",
        account: mockAccount,
      });

      expect(result.chain).toBe(base);
      expect(result.publicClient).toBe(mockPublicClient);
      expect(result.walletClient).toBe(mockWalletClient);
    });

    it("should resolve 'base-sepolia' network identifier correctly", async () => {
      const result = await resolveViemClients({
        networkOrNodeUrl: "base-sepolia",
        account: mockAccount,
      });

      expect(result.chain).toBe(baseSepolia);
      expect(result.publicClient).toBe(mockPublicClient);
      expect(result.walletClient).toBe(mockWalletClient);
    });

    it("should resolve 'mainnet' network identifier correctly", async () => {
      const result = await resolveViemClients({
        networkOrNodeUrl: "mainnet",
        account: mockAccount,
      });

      expect(result.chain).toBe(mainnet);
      expect(result.publicClient).toBe(mockPublicClient);
      expect(result.walletClient).toBe(mockWalletClient);
    });

    it("should resolve 'ethereum' network identifier correctly", async () => {
      const result = await resolveViemClients({
        networkOrNodeUrl: "ethereum",
        account: mockAccount,
      });

      expect(result.chain).toBe(mainnet);
      expect(result.publicClient).toBe(mockPublicClient);
      expect(result.walletClient).toBe(mockWalletClient);
    });

    it("should resolve 'sepolia' network identifier correctly", async () => {
      const result = await resolveViemClients({
        networkOrNodeUrl: "sepolia",
        account: mockAccount,
      });

      expect(result.chain).toBe(sepolia);
      expect(result.publicClient).toBe(mockPublicClient);
      expect(result.walletClient).toBe(mockWalletClient);
    });

    it("should handle case-insensitive network identifiers", async () => {
      const result = await resolveViemClients({
        networkOrNodeUrl: "BASE",
        account: mockAccount,
      });

      expect(result.chain).toBe(base);
    });

    it("should throw error for unsupported network identifier", async () => {
      await expect(
        resolveViemClients({
          networkOrNodeUrl: "unsupported-network",
          account: mockAccount,
        })
      ).rejects.toThrow("Invalid URL format: unsupported-network");
    });

    it("should include account in wallet client when provided", async () => {
      await resolveViemClients({
        networkOrNodeUrl: "base",
        account: mockAccount,
      });

      const { createWalletClient } = await import("viem");
      expect(vi.mocked(createWalletClient)).toHaveBeenCalledWith(
        expect.objectContaining({
          chain: base,
          account: mockAccount,
        })
      );
    });
  });

  describe("with Node URLs", () => {
    it("should resolve Node URL to base chain correctly", async () => {
      mockPublicClient.getChainId.mockResolvedValue(base.id);

      const result = await resolveViemClients({
        networkOrNodeUrl: "https://mainnet.base.org",
        account: mockAccount,
      });

      expect(result.chain).toBe(base);
      expect(result.publicClient).toBe(mockPublicClient);
      expect(result.walletClient).toBe(mockWalletClient);
    });

    it("should resolve Node URL to base-sepolia chain correctly", async () => {
      mockPublicClient.getChainId.mockResolvedValue(baseSepolia.id);

      const result = await resolveViemClients({
        networkOrNodeUrl: "https://sepolia.base.org",
        account: mockAccount,
      });

      expect(result.chain).toBe(baseSepolia);
      expect(result.publicClient).toBe(mockPublicClient);
      expect(result.walletClient).toBe(mockWalletClient);
    });

    it("should resolve Node URL to mainnet chain correctly", async () => {
      mockPublicClient.getChainId.mockResolvedValue(mainnet.id);

      const result = await resolveViemClients({
        networkOrNodeUrl: "https://eth-mainnet.alchemyapi.io/v2/your-api-key",
        account: mockAccount,
      });

      expect(result.chain).toBe(mainnet);
      expect(result.publicClient).toBe(mockPublicClient);
      expect(result.walletClient).toBe(mockWalletClient);
    });

    it("should handle URLs with query parameters", async () => {
      mockPublicClient.getChainId.mockResolvedValue(base.id);

      const result = await resolveViemClients({
        networkOrNodeUrl: "https://mainnet.base.org?apiKey=123&version=2",
        account: mockAccount,
      });

      expect(result.chain).toBe(base);
    });

    it("should handle URLs with ports", async () => {
      mockPublicClient.getChainId.mockResolvedValue(base.id);

      const result = await resolveViemClients({
        networkOrNodeUrl: "https://mainnet.base.org:8545",
        account: mockAccount,
      });

      expect(result.chain).toBe(base);
    });

    it("should handle HTTP URLs", async () => {
      mockPublicClient.getChainId.mockResolvedValue(base.id);

      const result = await resolveViemClients({
        networkOrNodeUrl: "http://localhost:8545",
        account: mockAccount,
      });

      expect(result.chain).toBe(base);
    });

    it("should throw error for malformed URLs", async () => {
      await expect(
        resolveViemClients({
          networkOrNodeUrl: "not-a-url",
          account: mockAccount,
        })
      ).rejects.toThrow("Invalid URL format: not-a-url");
    });

    it("should throw error for URLs without protocol", async () => {
      await expect(
        resolveViemClients({
          networkOrNodeUrl: "mainnet.base.org",
          account: mockAccount,
        })
      ).rejects.toThrow("Invalid URL format: mainnet.base.org");
    });

    it("should throw error for unsupported chain ID", async () => {
      mockPublicClient.getChainId.mockResolvedValue(999999);

      await expect(
        resolveViemClients({
          networkOrNodeUrl: "https://unsupported-chain.org",
          account: mockAccount,
        })
      ).rejects.toThrow("Unsupported chain ID: 999999");
    });

    it("should throw error when getChainId fails", async () => {
      mockPublicClient.getChainId.mockRejectedValue(new Error("Network error"));

      await expect(
        resolveViemClients({
          networkOrNodeUrl: "https://invalid-url.org",
          account: mockAccount,
        })
      ).rejects.toThrow("Failed to resolve chain ID from Node URL: Network error");
    });

    it("should include account in wallet client when provided", async () => {
      mockPublicClient.getChainId.mockResolvedValue(base.id);

      await resolveViemClients({
        networkOrNodeUrl: "https://mainnet.base.org",
        account: mockAccount,
      });

      const { createWalletClient } = await import("viem");
      expect(vi.mocked(createWalletClient)).toHaveBeenCalledWith(
        expect.objectContaining({
          chain: base,
          account: mockAccount,
        })
      );
    });
  });

  describe("client creation", () => {
    it("should create public client with default transport for network identifiers", async () => {
      await resolveViemClients({
        networkOrNodeUrl: "base",
        account: mockAccount,
      });

      const { createPublicClient, http } = await import("viem");
      expect(vi.mocked(createPublicClient)).toHaveBeenCalledWith({
        chain: base,
        transport: mockHttp,
      });
      expect(vi.mocked(http)).toHaveBeenCalledWith();
    });

    it("should create wallet client with default transport for network identifiers", async () => {
      await resolveViemClients({
        networkOrNodeUrl: "base",
        account: mockAccount,
      });

      const { createWalletClient, http } = await import("viem");
      expect(vi.mocked(createWalletClient)).toHaveBeenCalledWith({
        chain: base,
        transport: mockHttp,
      });
      expect(vi.mocked(http)).toHaveBeenCalledWith();
    });

    it("should create public client with Node URL transport", async () => {
      const nodeUrl = "https://mainnet.base.org";
      mockPublicClient.getChainId.mockResolvedValue(base.id);

      await resolveViemClients({
        networkOrNodeUrl: nodeUrl,
        account: mockAccount,
      });

      const { createPublicClient, http } = await import("viem");
      expect(vi.mocked(createPublicClient)).toHaveBeenCalledWith({
        chain: base,
        transport: mockHttp,
      });
      expect(vi.mocked(http)).toHaveBeenCalledWith(nodeUrl);
    });

    it("should create wallet client with Node URL transport", async () => {
      const nodeUrl = "https://mainnet.base.org";
      mockPublicClient.getChainId.mockResolvedValue(base.id);

      await resolveViemClients({
        networkOrNodeUrl: nodeUrl,
        account: mockAccount,
      });

      const { createWalletClient, http } = await import("viem");
      expect(vi.mocked(createWalletClient)).toHaveBeenCalledWith({
        chain: base,
        transport: mockHttp,
      });
      expect(vi.mocked(http)).toHaveBeenCalledWith(nodeUrl);
    });
  });
}); 