import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  X402Server,
  createX402Server,
  CDP_SERVER_DEFAULT_EVM_NETWORKS,
  CDP_SERVER_DEFAULT_SVM_NETWORKS,
  CDP_SERVER_DEFAULT_NETWORKS,
} from "./server.js";
import type { CdpServerConfig, CdpPaymentScheme } from "./server.js";
import {
  CDP_EXTENSION_GAS_SPONSORING_EIP2612,
  CDP_EXTENSION_GAS_SPONSORING_ERC20_APPROVAL,
  CDP_EXTENSION_BAZAAR,
  CDP_SUPPORTED_EXTENSIONS,
  getCdpDefaultSchemes,
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

const SIMPLE_ROUTES: CdpServerConfig["routes"] = {
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

    it("inline routes take precedence over file routes", async () => {
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
      expect(passedRoutes["GET /inline-route"]).toBeDefined();
      expect(passedRoutes["GET /file-route"]).toBeUndefined();
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
