import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  X402Server,
  createX402Server,
  CDP_SERVER_DEFAULT_EVM_NETWORKS,
  CDP_SERVER_DEFAULT_SVM_NETWORKS,
  CDP_SERVER_DEFAULT_NETWORKS,
  CDP_SERVER_DEVELOPMENT_EVM_NETWORKS,
  CDP_SERVER_DEVELOPMENT_SVM_NETWORKS,
  CDP_SERVER_DEVELOPMENT_NETWORKS,
} from "./server.js";
import type { CdpX402ServerConfig, CdpPaymentScheme } from "./server.js";
import {
  CDP_EXTENSION_GAS_SPONSORING_EIP2612,
  CDP_EXTENSION_GAS_SPONSORING_ERC20_APPROVAL,
  CDP_EXTENSION_BAZAAR,
  CDP_SUPPORTED_EXTENSIONS,
  buildBazaarDeclaration,
  getCdpDefaultSchemes,
  getCdpBatchSettlementScheme,
  getCdpExtensionRegistrations,
} from "./server-extensions.js";

// ---------------------------------------------------------------------------
// Mocks
//
// x402HTTPResourceServer is the base class X402Server extends. To make
// `extends` work in tests we mock it as a regular constructor function (not an
// arrow function) so `this` inside the mock refers to the new instance.
// ---------------------------------------------------------------------------

const {
  mockResourceServer,
  mockHttpInitialize,
  mockFacilitatorClient,
  MOCK_EVM_ADDRESS,
  MOCK_SVM_ADDRESS,
} = vi.hoisted(() => ({
  mockResourceServer: {
    register: vi.fn().mockReturnThis(),
    registerExtension: vi.fn().mockReturnThis(),
  },
  mockHttpInitialize: vi.fn().mockResolvedValue(undefined),
  mockFacilitatorClient: {},
  MOCK_EVM_ADDRESS: "0xabcdef1234567890abcdef1234567890abcdef12" as `0x${string}`,
  MOCK_SVM_ADDRESS: "7nYT1Dv9QfMsQHcZJbNyA9JkHqoVrpLmkCFfBjDqkbu",
}));

vi.mock("@x402/core/server", () => ({
  x402ResourceServer: vi.fn().mockImplementation(() => mockResourceServer),
  x402HTTPResourceServer: vi.fn().mockImplementation(function (
    this: Record<string, unknown>,
    resourceServer: unknown,
  ) {
    this.initialize = mockHttpInitialize;
    this.server = resourceServer;
  }),
}));

vi.mock("@x402/evm/exact/server", () => ({
  ExactEvmScheme: vi.fn().mockImplementation(() => ({ scheme: "exact", network: "eip155:*" })),
}));

vi.mock("@x402/evm/upto/server", () => ({
  UptoEvmScheme: vi.fn().mockImplementation(() => ({ scheme: "upto", network: "eip155:*" })),
}));

vi.mock("@x402/evm/batch-settlement/server", () => ({
  BatchSettlementEvmScheme: vi.fn().mockImplementation((receiverAddress: string) => ({
    scheme: "batch-settlement",
    network: "eip155:*",
    receiverAddress,
  })),
}));

vi.mock("@x402/svm/exact/server", () => ({
  ExactSvmScheme: vi.fn().mockImplementation(() => ({ scheme: "exact", network: "solana:*" })),
}));

vi.mock("./facilitator.js", () => ({
  createCdpFacilitatorClient: vi.fn().mockReturnValue(mockFacilitatorClient),
}));

const mockProvisionServerAccounts = vi.fn().mockResolvedValue({
  evmAddress: "0xabcdef1234567890abcdef1234567890abcdef12",
  svmAddress: "7nYT1Dv9QfMsQHcZJbNyA9JkHqoVrpLmkCFfBjDqkbu",
  ownerWallet: undefined,
});

// Mock the CdpClient used for wallet provisioning
vi.mock("../client/cdp.js", () => ({
  CdpClient: vi.fn().mockImplementation(() => ({
    evm: {
      getOrCreateAccount: vi.fn().mockResolvedValue({ address: MOCK_EVM_ADDRESS }),
      getOrCreateSmartAccount: vi.fn().mockResolvedValue({ address: MOCK_EVM_ADDRESS }),
      getSmartAccount: vi.fn().mockResolvedValue({ address: MOCK_EVM_ADDRESS }),
      listSmartAccounts: vi.fn().mockResolvedValue({ accounts: [], nextPageToken: undefined }),
    },
    solana: {
      getOrCreateAccount: vi.fn().mockResolvedValue({ address: MOCK_SVM_ADDRESS }),
    },
  })),
}));

vi.mock("node:fs/promises", () => ({
  readFile: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SIMPLE_ROUTES: CdpX402ServerConfig["routes"] = {
  "GET /report": { price: "$0.01", description: "test route" },
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("createX402Server", () => {
  const savedEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    mockHttpInitialize.mockResolvedValue(undefined);
    process.env.CDP_API_KEY_ID = "env-key-id";
    process.env.CDP_API_KEY_SECRET = "env-key-secret";
    process.env.CDP_WALLET_SECRET = "env-wallet-secret";
  });

  afterEach(() => {
    process.env = { ...savedEnv };
  });

  describe("factory basics", () => {
    it("returns an X402Server instance", async () => {
      const server = await createX402Server({ routes: SIMPLE_ROUTES });
      expect(server).toBeInstanceOf(X402Server);
    });

    it("is an instanceof x402HTTPResourceServer (drop-in interop)", async () => {
      const { x402HTTPResourceServer } = await import("@x402/core/server");
      const server = await createX402Server({ routes: SIMPLE_ROUTES });
      expect(server).toBeInstanceOf(x402HTTPResourceServer);
    });

    it("X402Server.create() is equivalent to createX402Server()", async () => {
      const a = await createX402Server({ routes: SIMPLE_ROUTES });
      const b = await X402Server.create({ routes: SIMPLE_ROUTES });
      expect(a).toBeInstanceOf(X402Server);
      expect(b).toBeInstanceOf(X402Server);
    });
  });

  describe("initialization", () => {
    it("creates an x402ResourceServer with the CDP facilitator client", async () => {
      const { x402ResourceServer } = await import("@x402/core/server");
      const { createCdpFacilitatorClient } = await import("./facilitator.js");

      await createX402Server({
        apiKeyId: "my-key",
        apiKeySecret: "my-secret",
        routes: SIMPLE_ROUTES,
      });

      expect(createCdpFacilitatorClient).toHaveBeenCalledWith({
        apiKeyId: "my-key",
        apiKeySecret: "my-secret",
      });
      expect(x402ResourceServer).toHaveBeenCalledWith(mockFacilitatorClient);
    });

    it("registers EVM and SVM schemes on the resource server", async () => {
      await createX402Server({ routes: SIMPLE_ROUTES });

      expect(mockResourceServer.register).toHaveBeenCalledWith(
        "eip155:*",
        expect.objectContaining({ scheme: "exact" }),
      );
      expect(mockResourceServer.register).toHaveBeenCalledWith(
        "eip155:*",
        expect.objectContaining({ scheme: "upto" }),
      );
      expect(mockResourceServer.register).toHaveBeenCalledWith(
        "solana:*",
        expect.objectContaining({ scheme: "exact" }),
      );
    });

    it("calls initialize() during create()", async () => {
      await createX402Server({ routes: SIMPLE_ROUTES });
      expect(mockHttpInitialize).toHaveBeenCalledOnce();
    });

    it("exposes payToEvmAddress after creation", async () => {
      const server = await createX402Server({ routes: SIMPLE_ROUTES });
      expect(server.payToEvmAddress).toBe(MOCK_EVM_ADDRESS);
    });

    it("exposes payToSvmAddress after creation", async () => {
      const server = await createX402Server({ routes: SIMPLE_ROUTES });
      expect(server.payToSvmAddress).toBe(MOCK_SVM_ADDRESS);
    });

    it("ownerWallet is undefined when provisioned wallet is EOA", async () => {
      const server = await createX402Server({ routes: SIMPLE_ROUTES });
      expect(server.ownerWallet).toBeUndefined();
    });

    it("exposes resourceServer pointing at the x402ResourceServer", async () => {
      const server = await createX402Server({ routes: SIMPLE_ROUTES });
      expect(server.resourceServer).toBe(mockResourceServer);
    });

    it("exposes resolvedRoutes with resolved payTo and extensions", async () => {
      const server = await createX402Server({ routes: SIMPLE_ROUTES });
      expect(server.resolvedRoutes).toBeDefined();
      expect(typeof server.resolvedRoutes).toBe("object");
      expect(Object.keys(server.resolvedRoutes as Record<string, unknown>)).toEqual(
        Object.keys(SIMPLE_ROUTES),
      );
    });
  });

  describe("credential resolution", () => {
    it("uses explicit args over server-scoped env over generic env", async () => {
      process.env.CDP_SERVER_API_KEY_ID = "server-key-id";
      process.env.CDP_SERVER_API_KEY_SECRET = "server-key-secret";
      const { createCdpFacilitatorClient } = await import("./facilitator.js");

      await createX402Server({
        apiKeyId: "explicit-key",
        apiKeySecret: "explicit-secret",
        routes: SIMPLE_ROUTES,
      });

      expect(createCdpFacilitatorClient).toHaveBeenCalledWith({
        apiKeyId: "explicit-key",
        apiKeySecret: "explicit-secret",
      });
    });

    it("uses CDP_SERVER_* env vars when set, over generic CDP_* vars", async () => {
      process.env.CDP_SERVER_API_KEY_ID = "server-key-id";
      process.env.CDP_SERVER_API_KEY_SECRET = "server-key-secret";
      const { createCdpFacilitatorClient } = await import("./facilitator.js");

      await createX402Server({ routes: SIMPLE_ROUTES });

      expect(createCdpFacilitatorClient).toHaveBeenCalledWith({
        apiKeyId: "server-key-id",
        apiKeySecret: "server-key-secret",
      });
    });

    it("falls back to generic CDP_API_KEY_* env vars when server-scoped vars are absent", async () => {
      delete process.env.CDP_SERVER_API_KEY_ID;
      delete process.env.CDP_SERVER_API_KEY_SECRET;
      const { createCdpFacilitatorClient } = await import("./facilitator.js");

      await createX402Server({ routes: SIMPLE_ROUTES });

      expect(createCdpFacilitatorClient).toHaveBeenCalledWith({
        apiKeyId: "env-key-id",
        apiKeySecret: "env-key-secret",
      });
    });
  });

  describe("payToConfig — type: address", () => {
    it("uses provided EVM and Solana addresses without provisioning wallets", async () => {
      const { CdpClient } = await import("../client/cdp.js");

      const server = await createX402Server({
        routes: { "GET /evm-only": { price: "$0.01", networks: ["eip155:8453"] } },
        payToConfig: {
          type: "address",
          evm: "0x1111111111111111111111111111111111111111",
          solana: "SolanaAddress111",
        },
      });

      expect(CdpClient).not.toHaveBeenCalled();
      expect(server.payToEvmAddress).toBe("0x1111111111111111111111111111111111111111");
      expect(server.payToSvmAddress).toBe("SolanaAddress111");
    });

    it("does not require wallet credentials when payToConfig.type is 'address'", async () => {
      delete process.env.CDP_WALLET_SECRET;
      delete process.env.CDP_SERVER_WALLET_SECRET;

      await expect(
        createX402Server({
          routes: { "GET /r": { price: "$0.01", networks: ["eip155:8453"] } },
          payToConfig: { type: "address", evm: "0x1234567890123456789012345678901234567890" },
        }),
      ).resolves.toBeInstanceOf(X402Server);
    });

    it("falls through to empty string when type is address and no evm provided", async () => {
      const server = await createX402Server({
        routes: {
          "GET /svm-only": {
            price: "$0.01",
            networks: ["solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp"],
          },
        },
        payToConfig: { type: "address", solana: "MySolanaAddress" },
      });
      expect(server.payToEvmAddress).toBe("");
      expect(server.payToSvmAddress).toBe("MySolanaAddress");
    });
  });

  describe("payToConfig — type: smart", () => {
    it("ownerWallet is set when provisioned wallet is a smart wallet", async () => {
      const { CdpClient } = await import("../client/cdp.js");
      const mockCdpInstance = {
        evm: {
          getOrCreateAccount: vi.fn().mockResolvedValue({ address: "0xowner" }),
          getOrCreateSmartAccount: vi.fn().mockResolvedValue({ address: MOCK_EVM_ADDRESS }),
          getSmartAccount: vi.fn(),
          listSmartAccounts: vi.fn(),
        },
        solana: {
          getOrCreateAccount: vi.fn().mockResolvedValue({ address: MOCK_SVM_ADDRESS }),
        },
      };
      vi.mocked(CdpClient).mockImplementationOnce(
        () => mockCdpInstance as ReturnType<typeof CdpClient>,
      );

      const server = await createX402Server({
        routes: SIMPLE_ROUTES,
        payToConfig: { type: "smart", ownerAccountName: "my-owner-account" },
      });

      expect(server.ownerWallet).toBe("my-owner-account");
      expect(server.payToEvmAddress).toBe(MOCK_EVM_ADDRESS);
    });
  });

  describe("route conversion — simplified CDP format", () => {
    it("converts simplified routes to x402 format with default EVM+SVM networks", async () => {
      const { x402HTTPResourceServer } = await import("@x402/core/server");

      await createX402Server({
        routes: { "GET /report": { price: "$0.01", description: "AI report" } },
      });

      const [, passedRoutes] = vi.mocked(x402HTTPResourceServer).mock.calls[0] as [
        unknown,
        Record<string, { accepts: Array<{ network: string; payTo: string; price: string }> }>,
      ];
      const accepts = passedRoutes["GET /report"].accepts;

      expect(Array.isArray(accepts)).toBe(true);
      expect(accepts).toHaveLength(2);
      const evmOpt = accepts.find(a => a.network.startsWith("eip155:"));
      const svmOpt = accepts.find(a => a.network.startsWith("solana:"));
      expect(evmOpt!.payTo).toBe(MOCK_EVM_ADDRESS);
      expect(svmOpt!.payTo).toBe(MOCK_SVM_ADDRESS);
      expect(evmOpt!.price).toBe("$0.01");
    });

    it("uses default mainnet networks when none specified", async () => {
      const { x402HTTPResourceServer } = await import("@x402/core/server");

      await createX402Server({ routes: { "GET /paid": { price: "$0.001" } } });

      const [, passedRoutes] = vi.mocked(x402HTTPResourceServer).mock.calls[0] as [
        unknown,
        Record<string, { accepts: Array<{ network: string }> }>,
      ];
      const accepts = passedRoutes["GET /paid"].accepts;
      const networks = accepts.map(a => a.network);
      expect(networks).toContain(CDP_SERVER_DEFAULT_EVM_NETWORKS[0]);
      expect(networks).toContain(CDP_SERVER_DEFAULT_SVM_NETWORKS[0]);
    });

    it("uses only the specified networks when provided", async () => {
      const { x402HTTPResourceServer } = await import("@x402/core/server");

      await createX402Server({
        routes: { "GET /evm-only": { price: "$0.01", networks: ["eip155:84532"] } },
      });

      const [, passedRoutes] = vi.mocked(x402HTTPResourceServer).mock.calls[0] as [
        unknown,
        Record<string, { accepts: { network: string; payTo: string } }>,
      ];
      const accepts = passedRoutes["GET /evm-only"].accepts;
      expect(Array.isArray(accepts)).toBe(false);
      expect(accepts.network).toBe("eip155:84532");
      expect(accepts.payTo).toBe(MOCK_EVM_ADDRESS);
    });

    it("uses a custom maxTimeoutSeconds when specified", async () => {
      const { x402HTTPResourceServer } = await import("@x402/core/server");

      await createX402Server({
        routes: {
          "GET /paid": { price: "$0.01", networks: ["eip155:8453"], maxTimeoutSeconds: 600 },
        },
      });

      const [, passedRoutes] = vi.mocked(x402HTTPResourceServer).mock.calls[0] as [
        unknown,
        Record<string, { accepts: { maxTimeoutSeconds: number } }>,
      ];
      expect(passedRoutes["GET /paid"].accepts.maxTimeoutSeconds).toBe(600);
    });

    it("passes description through to the x402 route config", async () => {
      const { x402HTTPResourceServer } = await import("@x402/core/server");

      await createX402Server({
        routes: {
          "GET /paid": { price: "$0.01", description: "My paid route", networks: ["eip155:8453"] },
        },
      });

      const [, passedRoutes] = vi.mocked(x402HTTPResourceServer).mock.calls[0] as [
        unknown,
        Record<string, { description: string }>,
      ];
      expect(passedRoutes["GET /paid"].description).toBe("My paid route");
    });

    it("throws when routes map is empty", async () => {
      await expect(createX402Server({ routes: {} })).rejects.toThrow(
        "createX402Server requires at least one payment route.",
      );
    });

    it("throws when routes is omitted", async () => {
      await expect(createX402Server({})).rejects.toThrow(
        "createX402Server requires at least one payment route.",
      );
    });
  });

  describe("route conversion — scheme field", () => {
    it("defaults to 'exact' when no scheme is specified", async () => {
      const { x402HTTPResourceServer } = await import("@x402/core/server");

      await createX402Server({
        routes: { "GET /report": { price: "$0.01", networks: ["eip155:8453"] } },
      });

      const [, passedRoutes] = vi.mocked(x402HTTPResourceServer).mock.calls[0] as [
        unknown,
        Record<string, { accepts: { scheme: string } }>,
      ];
      expect(passedRoutes["GET /report"].accepts.scheme).toBe("exact");
    });

    it("uses 'upto' scheme when specified for an EVM route", async () => {
      const { x402HTTPResourceServer } = await import("@x402/core/server");

      await createX402Server({
        routes: {
          "GET /metered": {
            price: "$0.01",
            scheme: "upto" as CdpPaymentScheme,
            networks: ["eip155:8453"],
          },
        },
      });

      const [, passedRoutes] = vi.mocked(x402HTTPResourceServer).mock.calls[0] as [
        unknown,
        Record<string, { accepts: { scheme: string } }>,
      ];
      expect(passedRoutes["GET /metered"].accepts.scheme).toBe("upto");
    });

    it("defaults to EVM-only networks when 'upto' scheme is used without explicit networks", async () => {
      const { x402HTTPResourceServer } = await import("@x402/core/server");

      await createX402Server({
        routes: { "GET /metered": { price: "$0.01", scheme: "upto" as CdpPaymentScheme } },
      });

      const [, passedRoutes] = vi.mocked(x402HTTPResourceServer).mock.calls[0] as [
        unknown,
        Record<string, { accepts: Array<{ network: string }> | { network: string } }>,
      ];
      const accepts = passedRoutes["GET /metered"].accepts;
      const networks = (Array.isArray(accepts) ? accepts : [accepts]).map(a => a.network);
      expect(networks.every(n => n.startsWith("eip155:"))).toBe(true);
      expect(networks).not.toContain(CDP_SERVER_DEFAULT_SVM_NETWORKS[0]);
    });

    it("throws when 'upto' scheme is used with a Solana network", async () => {
      await expect(
        createX402Server({
          routes: {
            "GET /bad": {
              price: "$0.01",
              scheme: "upto" as CdpPaymentScheme,
              networks: ["eip155:8453", "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp"],
            },
          },
        }),
      ).rejects.toThrow('Scheme "upto" only supports EVM (eip155:*) networks');
    });

    it("fills payTo for 'upto' scheme using EVM address", async () => {
      const { x402HTTPResourceServer } = await import("@x402/core/server");

      await createX402Server({
        routes: {
          "GET /metered": {
            price: "$0.01",
            scheme: "upto" as CdpPaymentScheme,
            networks: ["eip155:8453"],
          },
        },
      });

      const [, passedRoutes] = vi.mocked(x402HTTPResourceServer).mock.calls[0] as [
        unknown,
        Record<string, { accepts: { payTo: string } }>,
      ];
      expect(passedRoutes["GET /metered"].accepts.payTo).toBe(MOCK_EVM_ADDRESS);
    });
  });

  describe("route conversion — x402 RouteConfig interop (vacant payTo filling)", () => {
    it("fills a vacant payTo in an eip155 x402-format route", async () => {
      const { x402HTTPResourceServer } = await import("@x402/core/server");

      await createX402Server({
        routes: {
          "GET /evm": {
            accepts: {
              scheme: "exact" as const,
              price: "$0.01",
              network: "eip155:8453" as `${string}:${string}`,
              payTo: "",
              maxTimeoutSeconds: 300,
            },
          },
        },
      });

      const [, passedRoutes] = vi.mocked(x402HTTPResourceServer).mock.calls[0] as [
        unknown,
        Record<string, { accepts: { payTo: string } }>,
      ];
      expect(passedRoutes["GET /evm"].accepts.payTo).toBe(MOCK_EVM_ADDRESS);
    });

    it("fills a vacant payTo in a solana x402-format route", async () => {
      const { x402HTTPResourceServer } = await import("@x402/core/server");

      await createX402Server({
        routes: {
          "GET /svm": {
            accepts: {
              scheme: "exact" as const,
              price: "$0.01",
              network: "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1" as `${string}:${string}`,
              payTo: "",
              maxTimeoutSeconds: 300,
            },
          },
        },
      });

      const [, passedRoutes] = vi.mocked(x402HTTPResourceServer).mock.calls[0] as [
        unknown,
        Record<string, { accepts: { payTo: string } }>,
      ];
      expect(passedRoutes["GET /svm"].accepts.payTo).toBe(MOCK_SVM_ADDRESS);
    });

    it("does not overwrite an explicit payTo in an x402-format route", async () => {
      const { x402HTTPResourceServer } = await import("@x402/core/server");

      await createX402Server({
        routes: {
          "GET /explicit": {
            accepts: {
              scheme: "exact" as const,
              price: "$0.01",
              network: "eip155:8453" as `${string}:${string}`,
              payTo: "0x1234" as `0x${string}`,
              maxTimeoutSeconds: 300,
            },
          },
        },
      });

      const [, passedRoutes] = vi.mocked(x402HTTPResourceServer).mock.calls[0] as [
        unknown,
        Record<string, { accepts: { payTo: string } }>,
      ];
      expect(passedRoutes["GET /explicit"].accepts.payTo).toBe("0x1234");
    });

    it("fills vacant payTo across an array of accepts in an x402-format route", async () => {
      const { x402HTTPResourceServer } = await import("@x402/core/server");

      await createX402Server({
        routes: {
          "GET /multi": {
            accepts: [
              {
                scheme: "exact" as const,
                price: "$0.01",
                network: "eip155:84532" as `${string}:${string}`,
                payTo: "",
                maxTimeoutSeconds: 300,
              },
              {
                scheme: "exact" as const,
                price: "$0.01",
                network: "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1" as `${string}:${string}`,
                payTo: "",
                maxTimeoutSeconds: 300,
              },
            ],
          },
        },
      });

      const [, passedRoutes] = vi.mocked(x402HTTPResourceServer).mock.calls[0] as [
        unknown,
        Record<string, { accepts: Array<{ payTo: string }> }>,
      ];
      const [evmOpt, svmOpt] = passedRoutes["GET /multi"].accepts;
      expect(evmOpt!.payTo).toBe(MOCK_EVM_ADDRESS);
      expect(svmOpt!.payTo).toBe(MOCK_SVM_ADDRESS);
    });

    it("throws when a vacant payTo has an unrecognised network family", async () => {
      await expect(
        createX402Server({
          routes: {
            "GET /unknown": {
              accepts: {
                scheme: "exact" as const,
                price: "$0.01",
                network: "bitcoin:mainnet" as `${string}:${string}`,
                payTo: "",
                maxTimeoutSeconds: 300,
              },
            },
          },
        }),
      ).rejects.toThrow('Cannot fill vacant payTo for network "bitcoin:mainnet"');
    });

    it("allows mixing simplified and x402-format routes in the same map", async () => {
      const { x402HTTPResourceServer } = await import("@x402/core/server");

      await createX402Server({
        routes: {
          "GET /simple": { price: "$0.01", networks: ["eip155:8453"] },
          "GET /x402": {
            accepts: {
              scheme: "exact" as const,
              price: "$0.02",
              network: "eip155:8453" as `${string}:${string}`,
              payTo: "",
              maxTimeoutSeconds: 300,
            },
          },
        },
      });

      const [, passedRoutes] = vi.mocked(x402HTTPResourceServer).mock.calls[0] as [
        unknown,
        Record<string, { accepts: { payTo: string } }>,
      ];
      expect(passedRoutes["GET /simple"].accepts.payTo).toBe(MOCK_EVM_ADDRESS);
      expect(passedRoutes["GET /x402"].accepts.payTo).toBe(MOCK_EVM_ADDRESS);
    });
  });

  describe("configPath loading", () => {
    it("reads and merges a JSON config file when configPath is set", async () => {
      const { readFile } = await import("node:fs/promises");
      vi.mocked(readFile).mockResolvedValueOnce(
        JSON.stringify({ routes: { "GET /from-file": { price: "$0.05" } } }) as never,
      );

      const { x402HTTPResourceServer } = await import("@x402/core/server");

      await createX402Server({ configPath: "./x402.config.json" });

      expect(readFile).toHaveBeenCalledWith("./x402.config.json", "utf-8");
      const [, passedRoutes] = vi.mocked(x402HTTPResourceServer).mock.calls[0] as [
        unknown,
        Record<string, unknown>,
      ];
      expect(passedRoutes["GET /from-file"]).toBeDefined();
    });

    it("inline routes are merged with file routes; inline wins on conflicting keys", async () => {
      const { readFile } = await import("node:fs/promises");
      vi.mocked(readFile).mockResolvedValueOnce(
        JSON.stringify({ routes: { "GET /file-route": { price: "$0.99" } } }) as never,
      );

      const { x402HTTPResourceServer } = await import("@x402/core/server");

      await createX402Server({
        configPath: "./x402.config.json",
        routes: { "GET /inline-route": { price: "$0.01" } },
      });

      const [, passedRoutes] = vi.mocked(x402HTTPResourceServer).mock.calls[0] as [
        unknown,
        Record<string, unknown>,
      ];
      // Both routes are present — deep merge preserves non-conflicting file routes
      expect(passedRoutes["GET /inline-route"]).toBeDefined();
      expect(passedRoutes["GET /file-route"]).toBeDefined();
    });

    it("ignores configPath inside the JSON file to prevent circular references", async () => {
      const { readFile } = await import("node:fs/promises");
      vi.mocked(readFile).mockResolvedValueOnce(
        JSON.stringify({
          configPath: "./should-be-ignored.json",
          routes: { "GET /ok": { price: "$0.01" } },
        }) as never,
      );

      await createX402Server({ configPath: "./x402.config.json" });

      expect(readFile).toHaveBeenCalledOnce();
    });
  });

  describe("error propagation", () => {
    it("propagates errors from initialize() (facilitator sync)", async () => {
      mockHttpInitialize.mockRejectedValueOnce(new Error("facilitator unavailable"));

      await expect(createX402Server({ routes: SIMPLE_ROUTES })).rejects.toThrow(
        "facilitator unavailable",
      );
    });

    it("propagates errors from CdpClient wallet provisioning", async () => {
      const { CdpClient } = await import("../client/cdp.js");
      vi.mocked(CdpClient).mockImplementationOnce(() => {
        throw new Error("Invalid API key");
      });

      await expect(createX402Server({ routes: SIMPLE_ROUTES })).rejects.toThrow("Invalid API key");
    });

    it("throws when wallet credentials are missing and payToConfig is not 'address'", async () => {
      delete process.env.CDP_API_KEY_ID;
      delete process.env.CDP_SERVER_API_KEY_ID;
      delete process.env.CDP_API_KEY_SECRET;
      delete process.env.CDP_SERVER_API_KEY_SECRET;
      delete process.env.CDP_WALLET_SECRET;
      delete process.env.CDP_SERVER_WALLET_SECRET;

      await expect(createX402Server({ routes: SIMPLE_ROUTES })).rejects.toThrow(
        "Missing required CDP credentials",
      );
    });
  });
});

describe("CDP_SERVER_DEFAULT_NETWORKS", () => {
  it("contains at least one EVM and one Solana network", () => {
    const evmNets = CDP_SERVER_DEFAULT_NETWORKS.filter(n => n.startsWith("eip155:"));
    const svmNets = CDP_SERVER_DEFAULT_NETWORKS.filter(n => n.startsWith("solana:"));
    expect(evmNets.length).toBeGreaterThan(0);
    expect(svmNets.length).toBeGreaterThan(0);
  });

  it("CDP_SERVER_DEFAULT_EVM_NETWORKS contains Base mainnet", () => {
    expect(CDP_SERVER_DEFAULT_EVM_NETWORKS).toContain("eip155:8453");
  });

  it("CDP_SERVER_DEFAULT_SVM_NETWORKS contains Solana mainnet", () => {
    expect(CDP_SERVER_DEFAULT_SVM_NETWORKS[0]).toMatch(/^solana:/);
  });
});

describe("getCdpDefaultSchemes", () => {
  it("returns three entries — exact+upto for EVM and exact for Solana", () => {
    const schemes = getCdpDefaultSchemes();
    expect(schemes).toHaveLength(3);
    const evmSchemes = schemes.filter(s => (s.network as string) === "eip155:*");
    const svmSchemes = schemes.filter(s => (s.network as string) === "solana:*");
    expect(evmSchemes).toHaveLength(2);
    expect(svmSchemes).toHaveLength(1);
  });

  it("EVM entries cover exact and upto schemes", () => {
    const schemes = getCdpDefaultSchemes();
    const evmSchemeNames = schemes
      .filter(s => (s.network as string) === "eip155:*")
      .map(s => s.server.scheme);
    expect(evmSchemeNames).toContain("exact");
    expect(evmSchemeNames).toContain("upto");
  });

  it("Solana entry covers exact scheme only", () => {
    const schemes = getCdpDefaultSchemes();
    const svmEntry = schemes.find(s => (s.network as string) === "solana:*");
    expect(svmEntry?.server.scheme).toBe("exact");
  });

  it("returns independent instances on each call", () => {
    const a = getCdpDefaultSchemes();
    const b = getCdpDefaultSchemes();
    expect(a[0]!.server).not.toBe(b[0]!.server);
  });
});

describe("X402Server extension registration", () => {
  const savedEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    mockHttpInitialize.mockResolvedValue(undefined);
    process.env.CDP_API_KEY_ID = "env-key-id";
    process.env.CDP_API_KEY_SECRET = "env-key-secret";
    process.env.CDP_WALLET_SECRET = "env-wallet-secret";
  });

  afterEach(() => {
    process.env = { ...savedEnv };
  });

  it("registers all CDP extensions on x402ResourceServer during create()", async () => {
    await createX402Server({ routes: { "GET /report": { price: "$0.01" } } });

    const registeredKeys = vi
      .mocked(mockResourceServer.registerExtension)
      .mock.calls.map(call => (call[0] as { key: string }).key);

    expect(registeredKeys).toContain(CDP_EXTENSION_GAS_SPONSORING_EIP2612);
    expect(registeredKeys).toContain(CDP_EXTENSION_GAS_SPONSORING_ERC20_APPROVAL);
    expect(registeredKeys).toContain(CDP_EXTENSION_BAZAAR);
  });

  it("registers exactly the extensions from getCdpExtensionRegistrations()", async () => {
    await createX402Server({ routes: { "GET /report": { price: "$0.01" } } });

    const registeredKeys = vi
      .mocked(mockResourceServer.registerExtension)
      .mock.calls.map(call => (call[0] as { key: string }).key);

    const expectedKeys = getCdpExtensionRegistrations().map(r => r.key);
    expect(registeredKeys).toEqual(expect.arrayContaining(expectedKeys));
    expect(registeredKeys).toHaveLength(expectedKeys.length);
  });
});

describe("X402Server auto-injects gas-sponsoring extensions", () => {
  const savedEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    mockHttpInitialize.mockResolvedValue(undefined);
    process.env.CDP_API_KEY_ID = "env-key-id";
    process.env.CDP_API_KEY_SECRET = "env-key-secret";
    process.env.CDP_WALLET_SECRET = "env-wallet-secret";
  });

  afterEach(() => {
    process.env = { ...savedEnv };
  });

  it("every route receives gas-sponsoring extensions even with no user extensions", async () => {
    const { x402HTTPResourceServer } = await import("@x402/core/server");

    await createX402Server({
      routes: { "GET /report": { price: "$0.01", networks: ["eip155:8453"] } },
    });

    const [, passedRoutes] = vi.mocked(x402HTTPResourceServer).mock.calls[0] as [
      unknown,
      Record<string, { extensions: Record<string, unknown> }>,
    ];
    const ext = passedRoutes["GET /report"].extensions;
    expect(ext[CDP_EXTENSION_GAS_SPONSORING_EIP2612]).toBeDefined();
    expect(ext[CDP_EXTENSION_GAS_SPONSORING_ERC20_APPROVAL]).toBeDefined();
  });

  it("all keys from CDP_SUPPORTED_EXTENSIONS are present in every route", async () => {
    const { x402HTTPResourceServer } = await import("@x402/core/server");

    await createX402Server({
      routes: { "GET /report": { price: "$0.01", networks: ["eip155:8453"] } },
    });

    const [, passedRoutes] = vi.mocked(x402HTTPResourceServer).mock.calls[0] as [
      unknown,
      Record<string, { extensions: Record<string, unknown> }>,
    ];
    const ext = passedRoutes["GET /report"].extensions;
    for (const key of Object.keys(CDP_SUPPORTED_EXTENSIONS)) {
      expect(ext[key]).toBeDefined();
    }
  });

  it("bazaar IS auto-injected with a minimal declaration derived from the route pattern", async () => {
    const { x402HTTPResourceServer } = await import("@x402/core/server");

    await createX402Server({
      routes: { "GET /report": { price: "$0.01", networks: ["eip155:8453"] } },
    });

    const [, passedRoutes] = vi.mocked(x402HTTPResourceServer).mock.calls[0] as [
      unknown,
      Record<string, { extensions: Record<string, Record<string, unknown>> }>,
    ];
    const bazaar = passedRoutes["GET /report"].extensions[CDP_EXTENSION_BAZAAR];
    expect(bazaar).toBeDefined();
    expect((bazaar!.info as { input: { method: string } }).input.method).toBe("GET");
    expect(bazaar!.routeTemplate).toBe("/report");
  });

  it("user-provided bazaar declaration overrides the auto-generated one", async () => {
    const { x402HTTPResourceServer } = await import("@x402/core/server");

    const richBazaar = {
      info: {
        input: { type: "http", method: "GET", queryParams: { q: "example" } },
      },
      routeTemplate: "/search",
    };

    await createX402Server({
      routes: {
        "GET /search": {
          price: "$0.01",
          networks: ["eip155:8453"],
          extensions: { [CDP_EXTENSION_BAZAAR]: richBazaar },
        },
      },
    });

    const [, passedRoutes] = vi.mocked(x402HTTPResourceServer).mock.calls[0] as [
      unknown,
      Record<string, { extensions: Record<string, unknown> }>,
    ];
    const ext = passedRoutes["GET /search"].extensions;
    expect(ext[CDP_EXTENSION_GAS_SPONSORING_EIP2612]).toBeDefined();
    expect(ext[CDP_EXTENSION_BAZAAR]).toBe(richBazaar);
  });

  it("auto-injection applies to every route independently", async () => {
    const { x402HTTPResourceServer } = await import("@x402/core/server");

    await createX402Server({
      routes: {
        "GET /a": { price: "$0.01", networks: ["eip155:8453"] },
        "GET /b": { price: "$0.02", networks: ["eip155:8453"] },
      },
    });

    const [, passedRoutes] = vi.mocked(x402HTTPResourceServer).mock.calls[0] as [
      unknown,
      Record<string, { extensions: Record<string, unknown> }>,
    ];
    for (const pattern of ["GET /a", "GET /b"]) {
      expect(passedRoutes[pattern].extensions[CDP_EXTENSION_GAS_SPONSORING_EIP2612]).toBeDefined();
      expect(
        passedRoutes[pattern].extensions[CDP_EXTENSION_GAS_SPONSORING_ERC20_APPROVAL],
      ).toBeDefined();
    }
  });

  it("auto-injection also applies to full x402 RouteConfig format", async () => {
    const { x402HTTPResourceServer } = await import("@x402/core/server");

    await createX402Server({
      routes: {
        "GET /explicit": {
          accepts: {
            scheme: "exact" as const,
            price: "$0.01",
            network: "eip155:8453" as `${string}:${string}`,
            payTo: "",
            maxTimeoutSeconds: 300,
          },
        },
      },
    });

    const [, passedRoutes] = vi.mocked(x402HTTPResourceServer).mock.calls[0] as [
      unknown,
      Record<string, { extensions: Record<string, unknown> }>,
    ];
    const ext = passedRoutes["GET /explicit"].extensions;
    expect(ext[CDP_EXTENSION_GAS_SPONSORING_EIP2612]).toBeDefined();
    expect(ext[CDP_EXTENSION_GAS_SPONSORING_ERC20_APPROVAL]).toBeDefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Fix 1: CDP_X402_SERVER_ENVIRONMENT
// ─────────────────────────────────────────────────────────────────────────────

describe("CDP_SERVER_DEVELOPMENT_NETWORKS constants", () => {
  it("development EVM networks contains Base Sepolia", () => {
    expect(CDP_SERVER_DEVELOPMENT_EVM_NETWORKS).toContain("eip155:84532");
  });

  it("development SVM networks starts with solana:", () => {
    expect(CDP_SERVER_DEVELOPMENT_SVM_NETWORKS[0]).toMatch(/^solana:/);
  });

  it("development networks list contains one EVM and one Solana entry", () => {
    const evmNets = CDP_SERVER_DEVELOPMENT_NETWORKS.filter(n => n.startsWith("eip155:"));
    const svmNets = CDP_SERVER_DEVELOPMENT_NETWORKS.filter(n => n.startsWith("solana:"));
    expect(evmNets.length).toBeGreaterThan(0);
    expect(svmNets.length).toBeGreaterThan(0);
  });

  it("development and production EVM networks are distinct", () => {
    const devSet = new Set(CDP_SERVER_DEVELOPMENT_EVM_NETWORKS);
    const prodSet = new Set(CDP_SERVER_DEFAULT_EVM_NETWORKS);
    for (const n of devSet) {
      expect(prodSet.has(n)).toBe(false);
    }
  });
});

describe("createX402Server — environment / CDP_X402_SERVER_ENVIRONMENT", () => {
  const savedEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    mockHttpInitialize.mockResolvedValue(undefined);
    process.env.CDP_API_KEY_ID = "env-key-id";
    process.env.CDP_API_KEY_SECRET = "env-key-secret";
    process.env.CDP_WALLET_SECRET = "env-wallet-secret";
  });

  afterEach(() => {
    process.env = { ...savedEnv };
  });

  it("defaults to production networks (Base mainnet + Solana mainnet) when environment is not set", async () => {
    const { x402HTTPResourceServer } = await import("@x402/core/server");
    delete process.env.CDP_X402_SERVER_ENVIRONMENT;

    await createX402Server({ routes: { "GET /paid": { price: "$0.01" } } });

    const [, passedRoutes] = vi.mocked(x402HTTPResourceServer).mock.calls[0] as [
      unknown,
      Record<string, { accepts: Array<{ network: string }> }>,
    ];
    const networks = passedRoutes["GET /paid"].accepts.map(a => a.network);
    expect(networks).toContain(CDP_SERVER_DEFAULT_EVM_NETWORKS[0]); // Base mainnet
    expect(networks).toContain(CDP_SERVER_DEFAULT_SVM_NETWORKS[0]); // Solana mainnet
  });

  it("uses development networks when environment: 'development' is passed in config", async () => {
    const { x402HTTPResourceServer } = await import("@x402/core/server");

    await createX402Server({
      routes: { "GET /paid": { price: "$0.01" } },
      environment: "development",
    });

    const [, passedRoutes] = vi.mocked(x402HTTPResourceServer).mock.calls[0] as [
      unknown,
      Record<string, { accepts: Array<{ network: string }> }>,
    ];
    const networks = passedRoutes["GET /paid"].accepts.map(a => a.network);
    expect(networks).toContain(CDP_SERVER_DEVELOPMENT_EVM_NETWORKS[0]); // Base Sepolia
    expect(networks).toContain(CDP_SERVER_DEVELOPMENT_SVM_NETWORKS[0]); // Solana Devnet
    expect(networks).not.toContain(CDP_SERVER_DEFAULT_EVM_NETWORKS[0]); // not Base mainnet
  });

  it("reads development networks from CDP_X402_SERVER_ENVIRONMENT=development env var", async () => {
    const { x402HTTPResourceServer } = await import("@x402/core/server");
    process.env.CDP_X402_SERVER_ENVIRONMENT = "development";

    await createX402Server({ routes: { "GET /paid": { price: "$0.01" } } });

    const [, passedRoutes] = vi.mocked(x402HTTPResourceServer).mock.calls[0] as [
      unknown,
      Record<string, { accepts: Array<{ network: string }> }>,
    ];
    const networks = passedRoutes["GET /paid"].accepts.map(a => a.network);
    expect(networks).toContain(CDP_SERVER_DEVELOPMENT_EVM_NETWORKS[0]);
    expect(networks).not.toContain(CDP_SERVER_DEFAULT_EVM_NETWORKS[0]);
  });

  it("explicit config.environment beats the env var", async () => {
    const { x402HTTPResourceServer } = await import("@x402/core/server");
    process.env.CDP_X402_SERVER_ENVIRONMENT = "development";

    await createX402Server({
      routes: { "GET /paid": { price: "$0.01" } },
      environment: "production",
    });

    const [, passedRoutes] = vi.mocked(x402HTTPResourceServer).mock.calls[0] as [
      unknown,
      Record<string, { accepts: Array<{ network: string }> }>,
    ];
    const networks = passedRoutes["GET /paid"].accepts.map(a => a.network);
    expect(networks).toContain(CDP_SERVER_DEFAULT_EVM_NETWORKS[0]); // production (mainnet)
    expect(networks).not.toContain(CDP_SERVER_DEVELOPMENT_EVM_NETWORKS[0]);
  });

  it("upto with development environment defaults to development EVM networks only", async () => {
    const { x402HTTPResourceServer } = await import("@x402/core/server");

    await createX402Server({
      routes: { "GET /metered": { price: "$0.01", scheme: "upto" as CdpPaymentScheme } },
      environment: "development",
    });

    const [, passedRoutes] = vi.mocked(x402HTTPResourceServer).mock.calls[0] as [
      unknown,
      Record<string, { accepts: Array<{ network: string }> | { network: string } }>,
    ];
    const accepts = passedRoutes["GET /metered"].accepts;
    const networks = (Array.isArray(accepts) ? accepts : [accepts]).map(a => a.network);
    expect(networks.every(n => n.startsWith("eip155:"))).toBe(true);
    expect(networks).toContain(CDP_SERVER_DEVELOPMENT_EVM_NETWORKS[0]);
  });

  it("unknown CDP_X402_SERVER_ENVIRONMENT value falls back to production", async () => {
    const { x402HTTPResourceServer } = await import("@x402/core/server");
    process.env.CDP_X402_SERVER_ENVIRONMENT = "staging"; // unrecognised

    await createX402Server({ routes: { "GET /paid": { price: "$0.01" } } });

    const [, passedRoutes] = vi.mocked(x402HTTPResourceServer).mock.calls[0] as [
      unknown,
      Record<string, { accepts: Array<{ network: string }> }>,
    ];
    const networks = passedRoutes["GET /paid"].accepts.map(a => a.network);
    expect(networks).toContain(CDP_SERVER_DEFAULT_EVM_NETWORKS[0]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Fix 2: batch-settlement scheme support
// ─────────────────────────────────────────────────────────────────────────────

describe("getCdpBatchSettlementScheme", () => {
  it("returns an eip155:* registration with scheme batch-settlement and the given address", () => {
    const addr = "0xdeadbeef00000000000000000000000000000000" as `0x${string}`;
    const reg = getCdpBatchSettlementScheme(addr);
    expect(reg.network).toBe("eip155:*");
    expect(reg.server.scheme).toBe("batch-settlement");
    expect((reg.server as { receiverAddress: string }).receiverAddress).toBe(addr);
  });

  it("creates independent instances for different addresses", () => {
    const a = getCdpBatchSettlementScheme("0x1111111111111111111111111111111111111111");
    const b = getCdpBatchSettlementScheme("0x2222222222222222222222222222222222222222");
    expect(a.server).not.toBe(b.server);
  });
});

describe("createX402Server — batch-settlement scheme", () => {
  const savedEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    mockHttpInitialize.mockResolvedValue(undefined);
    process.env.CDP_API_KEY_ID = "env-key-id";
    process.env.CDP_API_KEY_SECRET = "env-key-secret";
    process.env.CDP_WALLET_SECRET = "env-wallet-secret";
  });

  afterEach(() => {
    process.env = { ...savedEnv };
  });

  it("registers batch-settlement scheme on x402ResourceServer after wallet provisioning", async () => {
    await createX402Server({ routes: SIMPLE_ROUTES });

    const registerCalls = vi.mocked(mockResourceServer.register).mock.calls;
    const batchCall = registerCalls.find(
      ([, scheme]) => (scheme as { scheme: string }).scheme === "batch-settlement",
    );
    expect(batchCall).toBeDefined();
    expect(batchCall![0]).toBe("eip155:*");
  });

  it("batch-settlement scheme is constructed with the provisioned EVM address", async () => {
    const { BatchSettlementEvmScheme } = await import("@x402/evm/batch-settlement/server");

    await createX402Server({ routes: SIMPLE_ROUTES });

    expect(BatchSettlementEvmScheme).toHaveBeenCalledWith(MOCK_EVM_ADDRESS);
  });

  it("batch-settlement scheme is registered even when payToConfig.type is 'address'", async () => {
    const EVM_ADDR = "0x0000000000000000000000000000000000000001" as `0x${string}`;

    await createX402Server({
      routes: { "GET /r": { price: "$0.01", networks: ["eip155:8453"] } },
      payToConfig: { type: "address", evm: EVM_ADDR },
    });

    const registerCalls = vi.mocked(mockResourceServer.register).mock.calls;
    const batchCall = registerCalls.find(
      ([, scheme]) => (scheme as { scheme: string }).scheme === "batch-settlement",
    );
    expect(batchCall).toBeDefined();
  });

  it("batch-settlement is accepted as a scheme in a simplified CDP route", async () => {
    const { x402HTTPResourceServer } = await import("@x402/core/server");

    await createX402Server({
      routes: {
        "GET /channel": {
          price: "$0.01",
          scheme: "batch-settlement" as CdpPaymentScheme,
          networks: ["eip155:8453"],
        },
      },
    });

    const [, passedRoutes] = vi.mocked(x402HTTPResourceServer).mock.calls[0] as [
      unknown,
      Record<string, { accepts: { scheme: string } }>,
    ];
    expect(passedRoutes["GET /channel"].accepts.scheme).toBe("batch-settlement");
  });

  it("batch-settlement defaults to EVM-only networks when networks is not specified", async () => {
    const { x402HTTPResourceServer } = await import("@x402/core/server");

    await createX402Server({
      routes: {
        "GET /channel": { price: "$0.01", scheme: "batch-settlement" as CdpPaymentScheme },
      },
    });

    const [, passedRoutes] = vi.mocked(x402HTTPResourceServer).mock.calls[0] as [
      unknown,
      Record<string, { accepts: Array<{ network: string }> | { network: string } }>,
    ];
    const accepts = passedRoutes["GET /channel"].accepts;
    const networks = (Array.isArray(accepts) ? accepts : [accepts]).map(a => a.network);
    expect(networks.every(n => n.startsWith("eip155:"))).toBe(true);
    expect(networks).not.toContain(CDP_SERVER_DEFAULT_SVM_NETWORKS[0]);
  });

  it("throws when batch-settlement is combined with a Solana network", async () => {
    await expect(
      createX402Server({
        routes: {
          "GET /bad": {
            price: "$0.01",
            scheme: "batch-settlement" as CdpPaymentScheme,
            networks: ["solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp"],
          },
        },
      }),
    ).rejects.toThrow('Scheme "batch-settlement" only supports EVM (eip155:*) networks');
  });

  it("payTo in batch-settlement route uses the provisioned EVM address", async () => {
    const { x402HTTPResourceServer } = await import("@x402/core/server");

    await createX402Server({
      routes: {
        "GET /channel": {
          price: "$0.01",
          scheme: "batch-settlement" as CdpPaymentScheme,
          networks: ["eip155:8453"],
        },
      },
    });

    const [, passedRoutes] = vi.mocked(x402HTTPResourceServer).mock.calls[0] as [
      unknown,
      Record<string, { accepts: { payTo: string } }>,
    ];
    expect(passedRoutes["GET /channel"].accepts.payTo).toBe(MOCK_EVM_ADDRESS);
  });

  it("batch-settlement is registered when full x402 route has explicit payTo and no evm in address payToConfig", async () => {
    const EXPLICIT_EVM = "0xdeadbeef00000000000000000000000000000000" as `0x${string}`;

    await createX402Server({
      routes: {
        "GET /channel": {
          accepts: {
            scheme: "batch-settlement" as const,
            price: "$0.01",
            network: "eip155:8453" as `${string}:${string}`,
            payTo: EXPLICIT_EVM,
            maxTimeoutSeconds: 300,
          },
        },
      },
      payToConfig: { type: "address", solana: "MySolanaAddress" }, // no evm — evmAddress resolves to ""
    });

    const registerCalls = vi.mocked(mockResourceServer.register).mock.calls;
    const batchCall = registerCalls.find(
      ([, scheme]) => (scheme as { scheme: string }).scheme === "batch-settlement",
    );
    expect(batchCall).toBeDefined();
    expect(batchCall![0]).toBe("eip155:*");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Fix 3: empty payTo guard for address payToConfig
// ─────────────────────────────────────────────────────────────────────────────

describe("createX402Server — empty payTo guard", () => {
  const savedEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    mockHttpInitialize.mockResolvedValue(undefined);
    process.env.CDP_API_KEY_ID = "env-key-id";
    process.env.CDP_API_KEY_SECRET = "env-key-secret";
    process.env.CDP_WALLET_SECRET = "env-wallet-secret";
  });

  afterEach(() => {
    process.env = { ...savedEnv };
  });

  it("throws when address payToConfig has no evm but the route includes an EVM network", async () => {
    await expect(
      createX402Server({
        routes: { "GET /r": { price: "$0.01", networks: ["eip155:8453"] } },
        payToConfig: { type: "address", solana: "MySolanaAddress" }, // no evm
      }),
    ).rejects.toThrow(/No receiver address for EVM/);
  });

  it("throws when address payToConfig has no solana but the route includes a Solana network", async () => {
    await expect(
      createX402Server({
        routes: {
          "GET /r": {
            price: "$0.01",
            networks: ["solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp"],
          },
        },
        payToConfig: { type: "address", evm: "0x1234567890123456789012345678901234567890" },
      }),
    ).rejects.toThrow(/No receiver address for Solana/);
  });

  it("throws when address payToConfig has no evm and default networks include EVM", async () => {
    // Default networks = Base mainnet + Solana mainnet. If only solana is provided
    // and no networks override, the EVM accept fails.
    await expect(
      createX402Server({
        routes: { "GET /r": { price: "$0.01" } }, // uses default networks (EVM + SVM)
        payToConfig: { type: "address", solana: "MySolanaAddress" },
      }),
    ).rejects.toThrow(/No receiver address for EVM/);
  });

  it("throws when a full x402 route has vacant payTo and address payToConfig has no evm", async () => {
    await expect(
      createX402Server({
        routes: {
          "GET /r": {
            accepts: {
              scheme: "exact" as const,
              price: "$0.01",
              network: "eip155:8453" as `${string}:${string}`,
              payTo: "",
              maxTimeoutSeconds: 300,
            },
          },
        },
        payToConfig: { type: "address", solana: "MySolanaAddress" },
      }),
    ).rejects.toThrow(/No receiver address for EVM/);
  });

  it("does NOT throw when only EVM network is used and only evm address is provided", async () => {
    await expect(
      createX402Server({
        routes: { "GET /r": { price: "$0.01", networks: ["eip155:8453"] } },
        payToConfig: { type: "address", evm: "0x1234567890123456789012345678901234567890" },
      }),
    ).resolves.toBeInstanceOf(X402Server);
  });

  it("does NOT throw when only Solana network is used and only solana address is provided", async () => {
    await expect(
      createX402Server({
        routes: {
          "GET /r": {
            price: "$0.01",
            networks: ["solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp"],
          },
        },
        payToConfig: {
          type: "address",
          solana: "3KzDtddx4i53FBkvCzuDmRbaMozTZoJBb1TToWhz3JfE",
        },
      }),
    ).resolves.toBeInstanceOf(X402Server);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Fix 4: configPath route deep-merge
// ─────────────────────────────────────────────────────────────────────────────

describe("createX402Server — configPath deep route merge", () => {
  const savedEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    mockHttpInitialize.mockResolvedValue(undefined);
    process.env.CDP_API_KEY_ID = "env-key-id";
    process.env.CDP_API_KEY_SECRET = "env-key-secret";
    process.env.CDP_WALLET_SECRET = "env-wallet-secret";
  });

  afterEach(() => {
    process.env = { ...savedEnv };
  });

  it("preserves both file routes and inline routes when keys do not overlap", async () => {
    const { readFile } = await import("node:fs/promises");
    vi.mocked(readFile).mockResolvedValueOnce(
      JSON.stringify({ routes: { "GET /from-file": { price: "$0.05" } } }) as never,
    );

    const { x402HTTPResourceServer } = await import("@x402/core/server");

    await createX402Server({
      configPath: "./x402.config.json",
      routes: { "GET /from-inline": { price: "$0.01" } },
    });

    const [, passedRoutes] = vi.mocked(x402HTTPResourceServer).mock.calls[0] as [
      unknown,
      Record<string, unknown>,
    ];
    // Both routes must be present
    expect(passedRoutes["GET /from-file"]).toBeDefined();
    expect(passedRoutes["GET /from-inline"]).toBeDefined();
  });

  it("inline route wins over file route when both share the same key", async () => {
    const { readFile } = await import("node:fs/promises");
    vi.mocked(readFile).mockResolvedValueOnce(
      JSON.stringify({ routes: { "GET /shared": { price: "$0.99" } } }) as never,
    );

    const { x402HTTPResourceServer } = await import("@x402/core/server");

    await createX402Server({
      configPath: "./x402.config.json",
      routes: { "GET /shared": { price: "$0.01" } },
    });

    const [, passedRoutes] = vi.mocked(x402HTTPResourceServer).mock.calls[0] as [
      unknown,
      Record<string, { accepts: { price: string } | Array<{ price: string }> }>,
    ];
    const accepts = passedRoutes["GET /shared"].accepts;
    const price = Array.isArray(accepts) ? accepts[0]!.price : accepts.price;
    expect(price).toBe("$0.01");
  });

  it("file-only routes are preserved when inline config has no routes", async () => {
    const { readFile } = await import("node:fs/promises");
    vi.mocked(readFile).mockResolvedValueOnce(
      JSON.stringify({ routes: { "GET /file-only": { price: "$0.05" } } }) as never,
    );

    const { x402HTTPResourceServer } = await import("@x402/core/server");

    await createX402Server({ configPath: "./x402.config.json" });

    const [, passedRoutes] = vi.mocked(x402HTTPResourceServer).mock.calls[0] as [
      unknown,
      Record<string, unknown>,
    ];
    expect(passedRoutes["GET /file-only"]).toBeDefined();
  });

  it("merges file and inline routes across multiple keys each side", async () => {
    const { readFile } = await import("node:fs/promises");
    vi.mocked(readFile).mockResolvedValueOnce(
      JSON.stringify({
        routes: {
          "GET /a": { price: "$0.01" },
          "GET /b": { price: "$0.02" },
        },
      }) as never,
    );

    const { x402HTTPResourceServer } = await import("@x402/core/server");

    await createX402Server({
      configPath: "./x402.config.json",
      routes: {
        "GET /c": { price: "$0.03" },
        "GET /d": { price: "$0.04" },
      },
    });

    const [, passedRoutes] = vi.mocked(x402HTTPResourceServer).mock.calls[0] as [
      unknown,
      Record<string, unknown>,
    ];
    expect(passedRoutes["GET /a"]).toBeDefined();
    expect(passedRoutes["GET /b"]).toBeDefined();
    expect(passedRoutes["GET /c"]).toBeDefined();
    expect(passedRoutes["GET /d"]).toBeDefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// buildBazaarDeclaration — body method declarations
// ─────────────────────────────────────────────────────────────────────────────

describe("buildBazaarDeclaration — query methods (GET / HEAD / DELETE)", () => {
  it.each(["GET", "HEAD", "DELETE"])("%s: info.input has type and method only", method => {
    const decl = buildBazaarDeclaration(method, "/resource");
    const input = (decl.info as { input: Record<string, unknown> }).input;
    expect(input.type).toBe("http");
    expect(input.method).toBe(method);
    expect(input.body).toBeUndefined();
    expect(input.bodyType).toBeUndefined();
  });

  it.each(["GET", "HEAD", "DELETE"])("%s: schema does not require body", method => {
    const decl = buildBazaarDeclaration(method, "/resource");
    const required = (decl.schema as { properties: { input: { required: string[] } } }).properties
      .input.required;
    expect(required).not.toContain("body");
    expect(required).not.toContain("bodyType");
  });

  it("GET: schema additionalProperties: false does not include body property", () => {
    const decl = buildBazaarDeclaration("GET", "/resource");
    const props = (
      decl.schema as { properties: { input: { properties: Record<string, unknown> } } }
    ).properties.input.properties;
    expect(props.body).toBeUndefined();
  });
});

describe("buildBazaarDeclaration — body methods (POST / PUT / PATCH)", () => {
  it.each(["POST", "PUT", "PATCH"])("%s: info.input includes body and bodyType", method => {
    const decl = buildBazaarDeclaration(method, "/submit");
    const input = (decl.info as { input: Record<string, unknown> }).input;
    expect(input.type).toBe("http");
    expect(input.method).toBe(method);
    expect(input.bodyType).toBe("json");
    expect(input.body).toBeDefined();
    expect(typeof input.body).toBe("object");
  });

  it.each(["POST", "PUT", "PATCH"])("%s: schema requires body and bodyType", method => {
    const decl = buildBazaarDeclaration(method, "/submit");
    const required = (decl.schema as { properties: { input: { required: string[] } } }).properties
      .input.required;
    expect(required).toContain("bodyType");
    expect(required).toContain("body");
  });

  it.each(["POST", "PUT", "PATCH"])("%s: schema defines body property", method => {
    const decl = buildBazaarDeclaration(method, "/submit");
    const props = (
      decl.schema as { properties: { input: { properties: Record<string, unknown> } } }
    ).properties.input.properties;
    expect(props.body).toBeDefined();
  });

  it("schema validates info (body present in both info and schema)", () => {
    // Structural self-consistency: body listed in required must also exist in
    // info.input; if schema has additionalProperties:false and lists body as
    // required, info.input.body being present is the only way AJV would pass.
    const decl = buildBazaarDeclaration("POST", "/submit");
    const input = (decl.info as { input: Record<string, unknown> }).input;
    const required = (
      decl.schema as {
        properties: { input: { required: string[]; additionalProperties: boolean } };
      }
    ).properties.input.required;

    // Every field listed as required must be present in info.input
    for (const field of required) {
      expect(Object.prototype.hasOwnProperty.call(input, field)).toBe(true);
    }
  });

  it("routeTemplate is set to the path", () => {
    const decl = buildBazaarDeclaration("POST", "/orders/:id");
    expect(decl.routeTemplate).toBe("/orders/:id");
  });
});

describe("buildBazaarDeclaration — auto-injected in POST route via createX402Server", () => {
  const savedEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    mockHttpInitialize.mockResolvedValue(undefined);
    process.env.CDP_API_KEY_ID = "env-key-id";
    process.env.CDP_API_KEY_SECRET = "env-key-secret";
    process.env.CDP_WALLET_SECRET = "env-wallet-secret";
  });

  afterEach(() => {
    process.env = { ...savedEnv };
  });

  it("POST route Bazaar declaration carries body field in info.input", async () => {
    const { x402HTTPResourceServer } = await import("@x402/core/server");

    await createX402Server({
      routes: { "POST /submit": { price: "$0.01", networks: ["eip155:8453"] } },
    });

    const [, passedRoutes] = vi.mocked(x402HTTPResourceServer).mock.calls[0] as [
      unknown,
      Record<string, { extensions: Record<string, Record<string, unknown>> }>,
    ];
    const bazaar = passedRoutes["POST /submit"].extensions[CDP_EXTENSION_BAZAAR];
    expect(bazaar).toBeDefined();
    const input = (bazaar!.info as { input: Record<string, unknown> }).input;
    expect(input.method).toBe("POST");
    expect(input.bodyType).toBe("json");
    expect(input.body).toBeDefined();
    expect(bazaar!.routeTemplate).toBe("/submit");
  });

  it("PUT route Bazaar declaration carries body field in info.input", async () => {
    const { x402HTTPResourceServer } = await import("@x402/core/server");

    await createX402Server({
      routes: { "PUT /resource": { price: "$0.01", networks: ["eip155:8453"] } },
    });

    const [, passedRoutes] = vi.mocked(x402HTTPResourceServer).mock.calls[0] as [
      unknown,
      Record<string, { extensions: Record<string, Record<string, unknown>> }>,
    ];
    const bazaar = passedRoutes["PUT /resource"].extensions[CDP_EXTENSION_BAZAAR];
    const input = (bazaar!.info as { input: Record<string, unknown> }).input;
    expect(input.body).toBeDefined();
    expect(input.bodyType).toBe("json");
  });
});
