import { describe, it, expect, vi, beforeEach } from "vitest";
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
});
