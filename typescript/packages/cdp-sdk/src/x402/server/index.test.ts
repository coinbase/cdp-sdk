import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  CdpResourceServer,
  createCdpResourceServer,
  getCdpDefaultSchemes,
  CDP_SERVER_DEFAULT_EVM_NETWORKS,
  CDP_SERVER_DEFAULT_SVM_NETWORKS,
  CDP_SERVER_DEFAULT_NETWORKS,
} from "./index.js";
import type { CdpResourceServerConfig, CdpPaymentScheme } from "./index.js";
import {
  CDP_EXTENSION_GAS_SPONSORING_EIP2612,
  CDP_EXTENSION_GAS_SPONSORING_ERC20_APPROVAL,
  CDP_EXTENSION_BAZAAR,
  CDP_SUPPORTED_EXTENSIONS,
  getCdpExtensionRegistrations,
} from "../extensions/index.js";

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
  registerExactEvmScheme: vi.fn(),
}));

vi.mock("@x402/evm/upto/server", () => ({
  UptoEvmScheme: vi.fn().mockImplementation(() => ({ scheme: "upto", network: "eip155:*" })),
}));

vi.mock("@x402/svm/exact/server", () => ({
  ExactSvmScheme: vi.fn().mockImplementation(() => ({ scheme: "exact", network: "solana:*" })),
  registerExactSvmScheme: vi.fn(),
}));

vi.mock("../facilitator/index.js", () => ({
  createCdpFacilitatorClient: vi.fn().mockReturnValue(mockFacilitatorClient),
}));

vi.mock("../wallets/provision.js", () => ({
  provisionCdpAccounts: vi.fn().mockResolvedValue({
    cdpClient: {},
    evmAddress: MOCK_EVM_ADDRESS,
    svmAddress: MOCK_SVM_ADDRESS,
    ownerWallet: undefined,
    evmSigner: {},
    svmSigner: {},
  }),
}));

vi.mock("node:fs/promises", () => ({
  readFile: vi.fn(),
}));

const SIMPLE_ROUTES: CdpResourceServerConfig["routes"] = {
  "GET /report": { price: "$0.01", description: "test route" },
};

describe("createCdpResourceServer", () => {
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
    it("returns a CdpResourceServer instance", async () => {
      const server = await createCdpResourceServer({ routes: SIMPLE_ROUTES });
      expect(server).toBeInstanceOf(CdpResourceServer);
    });

    it("is an instanceof x402HTTPResourceServer (drop-in interop)", async () => {
      const { x402HTTPResourceServer } = await import("@x402/core/server");
      const server = await createCdpResourceServer({ routes: SIMPLE_ROUTES });
      expect(server).toBeInstanceOf(x402HTTPResourceServer);
    });

    it("CdpResourceServer.create() is equivalent to createCdpResourceServer()", async () => {
      const a = await createCdpResourceServer({ routes: SIMPLE_ROUTES });
      const b = await CdpResourceServer.create({ routes: SIMPLE_ROUTES });
      expect(a).toBeInstanceOf(CdpResourceServer);
      expect(b).toBeInstanceOf(CdpResourceServer);
    });
  });

  describe("initialization", () => {
    it("creates an x402ResourceServer with the CDP facilitator client", async () => {
      const { x402ResourceServer } = await import("@x402/core/server");
      const { createCdpFacilitatorClient } = await import("../facilitator/index.js");

      await createCdpResourceServer({
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
      await createCdpResourceServer({ routes: SIMPLE_ROUTES });

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

    it("passes credentials to provisionCdpAccounts", async () => {
      const { provisionCdpAccounts } = await import("../wallets/provision.js");

      await createCdpResourceServer({
        apiKeyId: "cfg-id",
        apiKeySecret: "cfg-secret",
        walletSecret: "cfg-wallet",
        routes: SIMPLE_ROUTES,
      });

      expect(provisionCdpAccounts).toHaveBeenCalledWith(
        expect.objectContaining({
          apiKeyId: "cfg-id",
          apiKeySecret: "cfg-secret",
          walletSecret: "cfg-wallet",
        }),
        expect.any(Object),
      );
    });

    it("calls initialize() (facilitator sync) during create()", async () => {
      await createCdpResourceServer({ routes: SIMPLE_ROUTES });
      expect(mockHttpInitialize).toHaveBeenCalledOnce();
    });

    it("exposes payToEvmAddress after creation", async () => {
      const server = await createCdpResourceServer({ routes: SIMPLE_ROUTES });
      expect(server.payToEvmAddress).toBe(MOCK_EVM_ADDRESS);
    });

    it("exposes payToSvmAddress after creation", async () => {
      const server = await createCdpResourceServer({ routes: SIMPLE_ROUTES });
      expect(server.payToSvmAddress).toBe(MOCK_SVM_ADDRESS);
    });

    it("ownerWallet is undefined when provisioned wallet is EOA", async () => {
      const server = await createCdpResourceServer({ routes: SIMPLE_ROUTES });
      expect(server.ownerWallet).toBeUndefined();
    });

    it("ownerWallet is set when provisioned wallet is a smart wallet", async () => {
      const { provisionCdpAccounts } = await import("../wallets/provision.js");
      const MOCK_OWNER_NAME = "my-owner-account";
      (provisionCdpAccounts as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        cdpClient: {},
        evmAddress: MOCK_EVM_ADDRESS,
        svmAddress: MOCK_SVM_ADDRESS,
        ownerWallet: MOCK_OWNER_NAME,
        evmSigner: {},
        svmSigner: {},
      });

      const server = await createCdpResourceServer({ routes: SIMPLE_ROUTES });
      expect(server.ownerWallet).toBe(MOCK_OWNER_NAME);
    });

    it("exposes resourceServer pointing at the x402ResourceServer", async () => {
      const server = await createCdpResourceServer({ routes: SIMPLE_ROUTES });
      expect(server.resourceServer).toBe(mockResourceServer);
    });

    it("exposes resolvedRoutes with resolved payTo and extensions", async () => {
      const server = await createCdpResourceServer({ routes: SIMPLE_ROUTES });
      expect(server.resolvedRoutes).toBeDefined();
      expect(typeof server.resolvedRoutes).toBe("object");
      expect(Object.keys(server.resolvedRoutes)).toEqual(Object.keys(SIMPLE_ROUTES));
    });

    it("does not inherit receiver wallet type from env when walletConfig is omitted", async () => {
      const { provisionCdpAccounts } = await import("../wallets/provision.js");
      process.env.CDP_WALLET_TYPE = "cdp-smart";
      process.env.CDP_OWNER_ACCOUNT_NAME = "payer-owner-from-env";
      process.env.CDP_ACCOUNT_NAME = "payer-account-from-env";

      await createCdpResourceServer({ routes: SIMPLE_ROUTES });

      const [, walletConfig] = (provisionCdpAccounts as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(walletConfig).toEqual({
        type: "cdp-eoa",
        accountName: "x402-receiver-wallet-1",
        ownerAccountName: undefined,
      });
    });

    it("requires explicit ownerAccountName for cdp-smart receiver wallet config", async () => {
      process.env.CDP_OWNER_ACCOUNT_NAME = "payer-owner-from-env";

      await expect(
        createCdpResourceServer({
          routes: SIMPLE_ROUTES,
          walletConfig: { type: "cdp-smart" },
        }),
      ).rejects.toThrow(
        'Missing required owner account name for wallet type "cdp-smart". Provide it via walletConfig.ownerAccountName or set CDP_SERVER_OWNER_ACCOUNT_NAME.',
      );
    });

    it("uses server-scoped env fallbacks without inheriting generic wallet env vars", async () => {
      const { provisionCdpAccounts } = await import("../wallets/provision.js");
      process.env.CDP_WALLET_TYPE = "cdp-eoa";
      process.env.CDP_OWNER_ACCOUNT_NAME = "payer-owner-from-env";
      process.env.CDP_ACCOUNT_NAME = "payer-account-from-env";

      process.env.CDP_SERVER_WALLET_TYPE = "cdp-smart";
      process.env.CDP_SERVER_OWNER_ACCOUNT_NAME = "server-owner-from-env";
      process.env.CDP_SERVER_ACCOUNT_NAME = "server-account-from-env";

      await createCdpResourceServer({ routes: SIMPLE_ROUTES });

      const [, walletConfig] = (provisionCdpAccounts as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(walletConfig).toEqual({
        type: "cdp-smart",
        accountName: "server-account-from-env",
        ownerAccountName: "server-owner-from-env",
      });
    });
  });

  describe("route conversion — simplified CDP format", () => {
    it("converts simplified routes to x402 format with default EVM+SVM networks", async () => {
      const { x402HTTPResourceServer } = await import("@x402/core/server");

      await createCdpResourceServer({
        routes: { "GET /report": { price: "$0.01", description: "AI report" } },
      });

      const [, passedRoutes] = (x402HTTPResourceServer as ReturnType<typeof vi.fn>).mock.calls[0];
      const accepts = passedRoutes["GET /report"].accepts;

      expect(Array.isArray(accepts)).toBe(true);
      expect(accepts).toHaveLength(2);
      const evmOpt = accepts.find((a: { network: string }) => a.network.startsWith("eip155:"));
      const svmOpt = accepts.find((a: { network: string }) => a.network.startsWith("solana:"));
      expect(evmOpt.payTo).toBe(MOCK_EVM_ADDRESS);
      expect(svmOpt.payTo).toBe(MOCK_SVM_ADDRESS);
      expect(evmOpt.price).toBe("$0.01");
    });

    it("uses default mainnet networks when none specified", async () => {
      const { x402HTTPResourceServer } = await import("@x402/core/server");

      await createCdpResourceServer({ routes: { "GET /paid": { price: "$0.001" } } });

      const [, passedRoutes] = (x402HTTPResourceServer as ReturnType<typeof vi.fn>).mock.calls[0];
      const accepts = passedRoutes["GET /paid"].accepts;
      const networks = (accepts as Array<{ network: string }>).map(a => a.network);
      expect(networks).toContain(CDP_SERVER_DEFAULT_EVM_NETWORKS[0]);
      expect(networks).toContain(CDP_SERVER_DEFAULT_SVM_NETWORKS[0]);
    });

    it("uses only the specified networks when provided", async () => {
      const { x402HTTPResourceServer } = await import("@x402/core/server");

      await createCdpResourceServer({
        routes: { "GET /evm-only": { price: "$0.01", networks: ["eip155:84532"] } },
      });

      const [, passedRoutes] = (x402HTTPResourceServer as ReturnType<typeof vi.fn>).mock.calls[0];
      const accepts = passedRoutes["GET /evm-only"].accepts;
      expect(Array.isArray(accepts)).toBe(false);
      expect(accepts.network).toBe("eip155:84532");
      expect(accepts.payTo).toBe(MOCK_EVM_ADDRESS);
    });

    it("uses a custom maxTimeoutSeconds when specified", async () => {
      const { x402HTTPResourceServer } = await import("@x402/core/server");

      await createCdpResourceServer({
        routes: {
          "GET /paid": { price: "$0.01", networks: ["eip155:8453"], maxTimeoutSeconds: 600 },
        },
      });

      const [, passedRoutes] = (x402HTTPResourceServer as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(passedRoutes["GET /paid"].accepts.maxTimeoutSeconds).toBe(600);
    });

    it("passes description through to the x402 route config", async () => {
      const { x402HTTPResourceServer } = await import("@x402/core/server");

      await createCdpResourceServer({
        routes: {
          "GET /paid": { price: "$0.01", description: "My paid route", networks: ["eip155:8453"] },
        },
      });

      const [, passedRoutes] = (x402HTTPResourceServer as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(passedRoutes["GET /paid"].description).toBe("My paid route");
    });

    it("throws when routes map is empty", async () => {
      await expect(createCdpResourceServer({ routes: {} })).rejects.toThrow(
        "CdpResourceServer requires at least one payment route.",
      );
    });

    it("throws when routes is omitted", async () => {
      await expect(createCdpResourceServer({})).rejects.toThrow(
        "CdpResourceServer requires at least one payment route.",
      );
    });
  });

  describe("route conversion — scheme field", () => {
    it("defaults to 'exact' when no scheme is specified", async () => {
      const { x402HTTPResourceServer } = await import("@x402/core/server");

      await createCdpResourceServer({
        routes: { "GET /report": { price: "$0.01", networks: ["eip155:8453"] } },
      });

      const [, passedRoutes] = (x402HTTPResourceServer as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(passedRoutes["GET /report"].accepts.scheme).toBe("exact");
    });

    it("uses 'upto' scheme when specified for an EVM route", async () => {
      const { x402HTTPResourceServer } = await import("@x402/core/server");

      await createCdpResourceServer({
        routes: {
          "GET /metered": {
            price: "$0.01",
            scheme: "upto" as CdpPaymentScheme,
            networks: ["eip155:8453"],
          },
        },
      });

      const [, passedRoutes] = (x402HTTPResourceServer as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(passedRoutes["GET /metered"].accepts.scheme).toBe("upto");
    });

    it("defaults to EVM-only networks when 'upto' scheme is used without explicit networks", async () => {
      const { x402HTTPResourceServer } = await import("@x402/core/server");

      await createCdpResourceServer({
        routes: { "GET /metered": { price: "$0.01", scheme: "upto" as CdpPaymentScheme } },
      });

      const [, passedRoutes] = (x402HTTPResourceServer as ReturnType<typeof vi.fn>).mock.calls[0];
      const accepts = passedRoutes["GET /metered"].accepts;
      const networks = (Array.isArray(accepts) ? accepts : [accepts]).map(
        (a: { network: string }) => a.network,
      );
      expect(networks.every((n: string) => n.startsWith("eip155:"))).toBe(true);
      expect(networks).not.toContain(CDP_SERVER_DEFAULT_SVM_NETWORKS[0]);
    });

    it("throws when 'upto' scheme is used with a Solana network", async () => {
      await expect(
        createCdpResourceServer({
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

      await createCdpResourceServer({
        routes: {
          "GET /metered": {
            price: "$0.01",
            scheme: "upto" as CdpPaymentScheme,
            networks: ["eip155:8453"],
          },
        },
      });

      const [, passedRoutes] = (x402HTTPResourceServer as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(passedRoutes["GET /metered"].accepts.payTo).toBe(MOCK_EVM_ADDRESS);
    });
  });

  describe("route conversion — x402 RouteConfig interop (vacant payTo filling)", () => {
    it("fills a vacant payTo in an eip155 x402-format route", async () => {
      const { x402HTTPResourceServer } = await import("@x402/core/server");

      await createCdpResourceServer({
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

      const [, passedRoutes] = (x402HTTPResourceServer as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(passedRoutes["GET /evm"].accepts.payTo).toBe(MOCK_EVM_ADDRESS);
    });

    it("fills a vacant payTo in a solana x402-format route", async () => {
      const { x402HTTPResourceServer } = await import("@x402/core/server");

      await createCdpResourceServer({
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

      const [, passedRoutes] = (x402HTTPResourceServer as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(passedRoutes["GET /svm"].accepts.payTo).toBe(MOCK_SVM_ADDRESS);
    });

    it("does not overwrite an explicit payTo in an x402-format route", async () => {
      const { x402HTTPResourceServer } = await import("@x402/core/server");

      await createCdpResourceServer({
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

      const [, passedRoutes] = (x402HTTPResourceServer as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(passedRoutes["GET /explicit"].accepts.payTo).toBe("0x1234");
    });

    it("fills vacant payTo across an array of accepts in an x402-format route", async () => {
      const { x402HTTPResourceServer } = await import("@x402/core/server");

      await createCdpResourceServer({
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

      const [, passedRoutes] = (x402HTTPResourceServer as ReturnType<typeof vi.fn>).mock.calls[0];
      const [evmOpt, svmOpt] = passedRoutes["GET /multi"].accepts;
      expect(evmOpt.payTo).toBe(MOCK_EVM_ADDRESS);
      expect(svmOpt.payTo).toBe(MOCK_SVM_ADDRESS);
    });

    it("throws when a vacant payTo has an unrecognised network family", async () => {
      await expect(
        createCdpResourceServer({
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

    it("throws when x402-format route uses EVM-only upto scheme on Solana", async () => {
      await expect(
        createCdpResourceServer({
          routes: {
            "GET /invalid-upto": {
              accepts: {
                scheme: "upto" as const,
                price: "$0.01",
                network: "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1" as `${string}:${string}`,
                payTo: "",
                maxTimeoutSeconds: 300,
              },
            },
          },
        }),
      ).rejects.toThrow('Scheme "upto" only supports EVM (eip155:*) networks');
    });

    it("allows mixing simplified and x402-format routes in the same map", async () => {
      const { x402HTTPResourceServer } = await import("@x402/core/server");

      await createCdpResourceServer({
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

      const [, passedRoutes] = (x402HTTPResourceServer as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(passedRoutes["GET /simple"].accepts.payTo).toBe(MOCK_EVM_ADDRESS);
      expect(passedRoutes["GET /x402"].accepts.payTo).toBe(MOCK_EVM_ADDRESS);
    });
  });

  describe("configPath loading", () => {
    it("reads and merges a JSON config file when configPath is set", async () => {
      const { readFile } = await import("node:fs/promises");
      (readFile as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        JSON.stringify({ routes: { "GET /from-file": { price: "$0.05" } } }),
      );

      const { x402HTTPResourceServer } = await import("@x402/core/server");

      await createCdpResourceServer({ configPath: "./x402.config.json" });

      expect(readFile).toHaveBeenCalledWith("./x402.config.json", "utf-8");
      const [, passedRoutes] = (x402HTTPResourceServer as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(passedRoutes["GET /from-file"]).toBeDefined();
    });

    it("inline routes take precedence over file routes", async () => {
      const { readFile } = await import("node:fs/promises");
      (readFile as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        JSON.stringify({ routes: { "GET /file-route": { price: "$0.99" } } }),
      );

      const { x402HTTPResourceServer } = await import("@x402/core/server");

      await createCdpResourceServer({
        configPath: "./x402.config.json",
        routes: { "GET /inline-route": { price: "$0.01" } },
      });

      const [, passedRoutes] = (x402HTTPResourceServer as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(passedRoutes["GET /inline-route"]).toBeDefined();
      expect(passedRoutes["GET /file-route"]).toBeUndefined();
    });

    it("ignores configPath inside the JSON file to prevent circular references", async () => {
      const { readFile } = await import("node:fs/promises");
      (readFile as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        JSON.stringify({
          configPath: "./should-be-ignored.json",
          routes: { "GET /ok": { price: "$0.01" } },
        }),
      );

      await createCdpResourceServer({ configPath: "./x402.config.json" });

      expect(readFile).toHaveBeenCalledOnce();
    });
  });

  describe("error propagation", () => {
    it("propagates errors from provisionCdpAccounts", async () => {
      const { provisionCdpAccounts } = await import("../wallets/provision.js");
      (provisionCdpAccounts as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error("Missing CDP_WALLET_SECRET"),
      );

      await expect(createCdpResourceServer({ routes: SIMPLE_ROUTES })).rejects.toThrow(
        "Missing CDP_WALLET_SECRET",
      );
    });

    it("propagates errors from initialize() (facilitator sync)", async () => {
      mockHttpInitialize.mockRejectedValueOnce(new Error("facilitator unavailable"));

      await expect(createCdpResourceServer({ routes: SIMPLE_ROUTES })).rejects.toThrow(
        "facilitator unavailable",
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

  it("each entry carries a non-null server", () => {
    for (const s of getCdpDefaultSchemes()) {
      expect(s.server).toBeTruthy();
    }
  });

  it("returns independent instances on each call", () => {
    const a = getCdpDefaultSchemes();
    const b = getCdpDefaultSchemes();
    expect(a[0]!.server).not.toBe(b[0]!.server);
    expect(a[1]!.server).not.toBe(b[1]!.server);
    expect(a[2]!.server).not.toBe(b[2]!.server);
  });
});

describe("CdpResourceServer extension registration", () => {
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
    await createCdpResourceServer({
      routes: { "GET /report": { price: "$0.01" } },
    });

    const registeredKeys = (
      mockResourceServer.registerExtension as ReturnType<typeof vi.fn>
    ).mock.calls.map((call: [{ key: string }]) => call[0].key);

    expect(registeredKeys).toContain(CDP_EXTENSION_GAS_SPONSORING_EIP2612);
    expect(registeredKeys).toContain(CDP_EXTENSION_GAS_SPONSORING_ERC20_APPROVAL);
    expect(registeredKeys).toContain(CDP_EXTENSION_BAZAAR);
  });

  it("registers exactly the extensions from getCdpExtensionRegistrations()", async () => {
    await createCdpResourceServer({
      routes: { "GET /report": { price: "$0.01" } },
    });

    const registeredKeys = (
      mockResourceServer.registerExtension as ReturnType<typeof vi.fn>
    ).mock.calls.map((call: [{ key: string }]) => call[0].key);

    const expectedKeys = getCdpExtensionRegistrations().map(r => r.key);
    expect(registeredKeys).toEqual(expect.arrayContaining(expectedKeys));
    expect(registeredKeys).toHaveLength(expectedKeys.length);
  });
});

describe("CdpResourceServer auto-injects gas-sponsoring extensions", () => {
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

    await createCdpResourceServer({
      routes: { "GET /report": { price: "$0.01", networks: ["eip155:8453"] } },
    });

    const [, passedRoutes] = (x402HTTPResourceServer as ReturnType<typeof vi.fn>).mock.calls[0];
    const ext = passedRoutes["GET /report"].extensions;
    expect(ext[CDP_EXTENSION_GAS_SPONSORING_EIP2612]).toBeDefined();
    expect(ext[CDP_EXTENSION_GAS_SPONSORING_ERC20_APPROVAL]).toBeDefined();
  });

  it("all keys from CDP_SUPPORTED_EXTENSIONS are present in every route", async () => {
    const { x402HTTPResourceServer } = await import("@x402/core/server");

    await createCdpResourceServer({
      routes: { "GET /report": { price: "$0.01", networks: ["eip155:8453"] } },
    });

    const [, passedRoutes] = (x402HTTPResourceServer as ReturnType<typeof vi.fn>).mock.calls[0];
    const ext = passedRoutes["GET /report"].extensions;
    for (const key of Object.keys(CDP_SUPPORTED_EXTENSIONS)) {
      expect(ext[key]).toBeDefined();
    }
  });

  it("bazaar IS auto-injected with a minimal declaration derived from the route pattern", async () => {
    const { x402HTTPResourceServer } = await import("@x402/core/server");

    await createCdpResourceServer({
      routes: { "GET /report": { price: "$0.01", networks: ["eip155:8453"] } },
    });

    const [, passedRoutes] = (x402HTTPResourceServer as ReturnType<typeof vi.fn>).mock.calls[0];
    const bazaar = passedRoutes["GET /report"].extensions[CDP_EXTENSION_BAZAAR] as Record<
      string,
      unknown
    >;
    expect(bazaar).toBeDefined();
    expect((bazaar.info as { input: { method: string } }).input.method).toBe("GET");
    expect(bazaar.routeTemplate).toBe("/report");
  });

  it("auto-injected bazaar uses POST bodyType for body-method routes", async () => {
    const { x402HTTPResourceServer } = await import("@x402/core/server");

    await createCdpResourceServer({
      routes: { "POST /orders": { price: "$0.01", networks: ["eip155:8453"] } },
    });

    const [, passedRoutes] = (x402HTTPResourceServer as ReturnType<typeof vi.fn>).mock.calls[0];
    const bazaar = passedRoutes["POST /orders"].extensions[CDP_EXTENSION_BAZAAR] as Record<
      string,
      unknown
    >;
    expect((bazaar.info as { input: { method: string; bodyType: string } }).input.method).toBe(
      "POST",
    );
    expect((bazaar.info as { input: { bodyType: string } }).input.bodyType).toBe("json");
    expect(bazaar.routeTemplate).toBe("/orders");
  });

  it("user-provided bazaar declaration overrides the auto-generated one", async () => {
    const { x402HTTPResourceServer } = await import("@x402/core/server");

    const richBazaar = {
      info: {
        input: { type: "http", method: "GET", queryParams: { q: "example" } },
        output: { type: "json", example: { results: [] } },
      },
      routeTemplate: "/search",
    };

    await createCdpResourceServer({
      routes: {
        "GET /search": {
          price: "$0.01",
          networks: ["eip155:8453"],
          extensions: { [CDP_EXTENSION_BAZAAR]: richBazaar },
        },
      },
    });

    const [, passedRoutes] = (x402HTTPResourceServer as ReturnType<typeof vi.fn>).mock.calls[0];
    const ext = passedRoutes["GET /search"].extensions;
    expect(ext[CDP_EXTENSION_GAS_SPONSORING_EIP2612]).toBeDefined();
    expect(ext[CDP_EXTENSION_BAZAAR]).toBe(richBazaar);
  });

  it("user declaration for a gas-sponsoring key takes precedence over auto-inject", async () => {
    const { x402HTTPResourceServer } = await import("@x402/core/server");

    const customDeclaration = { customField: "customValue" };

    await createCdpResourceServer({
      routes: {
        "GET /report": {
          price: "$0.01",
          networks: ["eip155:8453"],
          extensions: { [CDP_EXTENSION_GAS_SPONSORING_EIP2612]: customDeclaration },
        },
      },
    });

    const [, passedRoutes] = (x402HTTPResourceServer as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(passedRoutes["GET /report"].extensions[CDP_EXTENSION_GAS_SPONSORING_EIP2612]).toBe(
      customDeclaration,
    );
  });

  it("auto-injection applies to every route independently", async () => {
    const { x402HTTPResourceServer } = await import("@x402/core/server");

    await createCdpResourceServer({
      routes: {
        "GET /a": { price: "$0.01", networks: ["eip155:8453"] },
        "GET /b": { price: "$0.02", networks: ["eip155:8453"] },
      },
    });

    const [, passedRoutes] = (x402HTTPResourceServer as ReturnType<typeof vi.fn>).mock.calls[0];
    for (const pattern of ["GET /a", "GET /b"]) {
      expect(passedRoutes[pattern].extensions[CDP_EXTENSION_GAS_SPONSORING_EIP2612]).toBeDefined();
      expect(
        passedRoutes[pattern].extensions[CDP_EXTENSION_GAS_SPONSORING_ERC20_APPROVAL],
      ).toBeDefined();
    }
  });

  it("auto-injection also applies to full x402 RouteConfig format", async () => {
    const { x402HTTPResourceServer } = await import("@x402/core/server");

    await createCdpResourceServer({
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

    const [, passedRoutes] = (x402HTTPResourceServer as ReturnType<typeof vi.fn>).mock.calls[0];
    const ext = passedRoutes["GET /explicit"].extensions;
    expect(ext[CDP_EXTENSION_GAS_SPONSORING_EIP2612]).toBeDefined();
    expect(ext[CDP_EXTENSION_GAS_SPONSORING_ERC20_APPROVAL]).toBeDefined();
  });
});
