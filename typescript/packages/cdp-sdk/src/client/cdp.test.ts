import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from "vitest";
import { CdpClient } from "./cdp.js";
import { CdpOpenApiClient } from "../openapi-client/index.js";
import { version } from "../version.js";
import { EvmClient } from "./evm/evm.js";
import { SolanaClient } from "./solana/solana.js";

vi.mock("../openapi-client", () => {
  return {
    CdpOpenApiClient: {
      configure: vi.fn(),
    },
  };
});

describe("CdpClient", () => {
  const options = {
    apiKeyId: "test-api-key-id",
    apiKeySecret: "test-api-key-secret",
    walletSecret: "test-wallet-secret",
    debugging: true,
    basePath: "https://test-base-path.com",
  };

  let client: CdpClient;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new CdpClient(options);
  });

  it("should initialize with the correct options", () => {
    expect(CdpOpenApiClient.configure).toHaveBeenCalledWith({
      apiKeyId: options.apiKeyId,
      apiKeySecret: options.apiKeySecret,
      walletSecret: options.walletSecret,
      basePath: options.basePath,
      debugging: options.debugging,
      source: "sdk",
      sourceVersion: version,
    });

    expect(client.evm).toBeInstanceOf(EvmClient);
    expect(client.solana).toBeInstanceOf(SolanaClient);
  });

  describe("Node.js version check", () => {
    it("should throw an error if the Node.js version is less than 19", () => {
      const originalNodeVersion = process.versions.node;
      Object.defineProperty(process.versions, "node", {
        value: "18.12.0",
        configurable: true,
      });

      expect(() => new CdpClient()).toThrowErrorMatchingInlineSnapshot(`
        [Error: 
        Node.js version 18.12.0 is not supported. CDP SDK requires Node.js version 19 or higher. Please upgrade your Node.js version to use the CDP SDK.
        We recommend using https://github.com/Schniz/fnm for managing your Node.js version.
                ]
      `);

      Object.defineProperty(process.versions, "node", {
        value: originalNodeVersion,
        configurable: true,
      });
    });
  });
});
