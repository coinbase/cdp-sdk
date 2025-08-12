import { describe, it, expect, vi, beforeEach, MockedFunction } from "vitest";
import { base, baseSepolia, mainnet } from "viem/chains";
import { createPublicClient, createWalletClient, http } from "viem";
import type { PublicClient, WalletClient, HttpTransport } from "viem";

import { resolveViemClients } from "./resolveViemClients.js";

vi.mock("viem", async () => {
  const actual = await vi.importActual("viem");
  return {
    ...actual,
    createPublicClient: vi.fn(),
    createWalletClient: vi.fn(),
    http: vi.fn(),
  };
});

vi.mock("./getBaseNodeRpcUrl.js", () => ({
  getBaseNodeRpcUrl: vi.fn().mockResolvedValue("https://mocked-base-rpc.url"),
}));

const mockCreatePublicClient = createPublicClient as MockedFunction<typeof createPublicClient>;
const mockCreateWalletClient = createWalletClient as MockedFunction<typeof createWalletClient>;
const mockHttp = http as MockedFunction<typeof http>;

type MockTransport = {
  config: {
    url: string | undefined;
  };
};

type MockPublicClient = {
  transport: MockTransport;
  getChainId?: ReturnType<typeof vi.fn>;
};

type MockWalletClient = {
  transport: MockTransport;
};

type MockHttpTransport = {
  url: string | undefined;
};

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
      const mockPublicClient: MockPublicClient = {
        transport: { config: { url: "https://mocked-base-rpc.url" } },
      };
      const mockWalletClient: MockWalletClient = {
        transport: { config: { url: "https://mocked-base-rpc.url" } },
      };
      const mockTransport: MockHttpTransport = { url: "https://mocked-base-rpc.url" };

      mockCreatePublicClient.mockReturnValue(mockPublicClient as unknown as PublicClient);
      mockCreateWalletClient.mockReturnValue(mockWalletClient as unknown as WalletClient);
      mockHttp.mockReturnValue(mockTransport as unknown as HttpTransport);

      const result = await resolveViemClients({
        networkOrNodeUrl: "base",
        account: mockAccount,
      });

      expect(result.chain).toBe(base);
      expect(result.publicClient.transport.config.url).toBe("https://mocked-base-rpc.url");
      expect(result.walletClient.transport.config.url).toBe("https://mocked-base-rpc.url");
    });

    it("should resolve 'base-sepolia' network identifier correctly", async () => {
      const mockPublicClient: MockPublicClient = {
        transport: { config: { url: "https://mocked-base-rpc.url" } },
      };
      const mockWalletClient: MockWalletClient = {
        transport: { config: { url: "https://mocked-base-rpc.url" } },
      };
      const mockTransport: MockHttpTransport = { url: "https://mocked-base-rpc.url" };

      mockCreatePublicClient.mockReturnValue(mockPublicClient as unknown as PublicClient);
      mockCreateWalletClient.mockReturnValue(mockWalletClient as unknown as WalletClient);
      mockHttp.mockReturnValue(mockTransport as unknown as HttpTransport);

      const result = await resolveViemClients({
        networkOrNodeUrl: "base-sepolia",
        account: mockAccount,
      });

      expect(result.chain).toBe(baseSepolia);
      expect(result.publicClient.transport.config.url).toBe("https://mocked-base-rpc.url");
      expect(result.walletClient.transport.config.url).toBe("https://mocked-base-rpc.url");
    });

    it("should resolve 'ethereum' network identifier correctly", async () => {
      const mockPublicClient: MockPublicClient = { transport: { config: { url: undefined } } };
      const mockWalletClient: MockWalletClient = { transport: { config: { url: undefined } } };
      const mockTransport: MockHttpTransport = { url: undefined };

      mockCreatePublicClient.mockReturnValue(mockPublicClient as unknown as PublicClient);
      mockCreateWalletClient.mockReturnValue(mockWalletClient as unknown as WalletClient);
      mockHttp.mockReturnValue(mockTransport as unknown as HttpTransport);

      const result = await resolveViemClients({
        networkOrNodeUrl: "ethereum",
        account: mockAccount,
      });

      expect(result.chain).toBe(mainnet);
      expect(result.publicClient.transport.config.url).toBe(undefined);
      expect(result.walletClient.transport.config.url).toBe(undefined);
    });
  });

  describe("with Node URLs", () => {
    it("should resolve Node URL to base chain correctly", async () => {
      const tempPublicClient: MockPublicClient = {
        transport: { config: { url: "https://mainnet.base.org" } },
        getChainId: vi.fn().mockResolvedValue(8453),
      };
      const finalPublicClient: MockPublicClient = {
        transport: { config: { url: "https://mainnet.base.org" } },
      };
      const finalWalletClient: MockWalletClient = {
        transport: { config: { url: "https://mainnet.base.org" } },
      };
      const mockTransport: MockHttpTransport = { url: "https://mainnet.base.org" };

      mockCreatePublicClient
        .mockReturnValueOnce(tempPublicClient as unknown as PublicClient)
        .mockReturnValue(finalPublicClient as unknown as PublicClient);
      mockCreateWalletClient.mockReturnValue(finalWalletClient as unknown as WalletClient);
      mockHttp.mockReturnValue(mockTransport as unknown as HttpTransport);

      const result = await resolveViemClients({
        networkOrNodeUrl: "https://mainnet.base.org",
        account: mockAccount,
      });

      expect(result.chain).toBe(base);
      expect(result.publicClient.transport.config.url).toBe("https://mainnet.base.org");
      expect(result.walletClient.transport.config.url).toBe("https://mainnet.base.org");
    });

    it("should resolve Node URL to base-sepolia chain correctly", async () => {
      const tempPublicClient: MockPublicClient = {
        transport: { config: { url: "https://sepolia.base.org" } },
        getChainId: vi.fn().mockResolvedValue(84532),
      };
      const finalPublicClient: MockPublicClient = {
        transport: { config: { url: "https://sepolia.base.org" } },
      };
      const finalWalletClient: MockWalletClient = {
        transport: { config: { url: "https://sepolia.base.org" } },
      };
      const mockTransport: MockHttpTransport = { url: "https://sepolia.base.org" };

      mockCreatePublicClient
        .mockReturnValueOnce(tempPublicClient as unknown as PublicClient)
        .mockReturnValue(finalPublicClient as unknown as PublicClient);
      mockCreateWalletClient.mockReturnValue(finalWalletClient as unknown as WalletClient);
      mockHttp.mockReturnValue(mockTransport as unknown as HttpTransport);

      const result = await resolveViemClients({
        networkOrNodeUrl: "https://sepolia.base.org",
        account: mockAccount,
      });

      expect(result.chain).toBe(baseSepolia);
      expect(result.publicClient.transport.config.url).toBe("https://sepolia.base.org");
      expect(result.walletClient.transport.config.url).toBe("https://sepolia.base.org");
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
      const failingPublicClient: MockPublicClient = {
        transport: { config: { url: "https://invalid-url.org" } },
        getChainId: vi.fn().mockRejectedValue(new Error("HTTP request failed")),
      };

      mockCreatePublicClient.mockReturnValueOnce(failingPublicClient as unknown as PublicClient);

      await expect(
        resolveViemClients({
          networkOrNodeUrl: "https://invalid-url.org",
          account: mockAccount,
        }),
      ).rejects.toThrow("Failed to resolve chain ID from Node URL: HTTP request failed");
    });
  });
});
