import { describe, it, expect, vi, beforeEach, MockedFunction } from "vitest";

import { Analytics } from "../../analytics.js";
import { UserInputValidationError } from "../../errors.js";
import { CdpOpenApiClient, Vault } from "../../openapi-client/index.js";

import { LendClient } from "./lend.js";

vi.mock("../../openapi-client/index.js", () => {
  return {
    CdpOpenApiClient: {
      listVaults: vi.fn(),
      getVault: vi.fn(),
    },
  };
});

vi.mock("../../analytics.js", () => ({
  Analytics: {
    trackAction: vi.fn(),
    trackError: vi.fn(),
  },
}));

const vault: Vault = {
  vaultId: "vault_019f5f10-096a-7a23-86df-f479650d813f",
  address: "0x15966F1582CAEFB56CDB4Fba1dC622E41F2Ad33D",
  catalogVaultId: "cv_019ee022-3586-7473-8354-b2c32c18221a",
  underlyingAsset: "usdc",
  performanceFeeBps: 2000,
  feeRecipientAddress: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
  network: "base",
  status: "active",
  createdAt: "2026-09-15T15:39:37Z",
  metrics: {
    apyBps: 500,
    apyUpdatedAt: "2026-09-22T00:00:00Z",
    tvl: "1000",
    tvlUpdatedAt: "2026-09-22T00:00:00Z",
  },
};

describe("LendClient", () => {
  let client: LendClient;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new LendClient();
  });

  describe("listVaults", () => {
    it("should list vaults with default options", async () => {
      const listVaultsMock = CdpOpenApiClient.listVaults as MockedFunction<
        typeof CdpOpenApiClient.listVaults
      >;
      listVaultsMock.mockResolvedValue({ vaults: [vault] });

      const result = await client.listVaults();

      expect(listVaultsMock).toHaveBeenCalledWith({ pageSize: undefined, pageToken: undefined });
      expect(result).toEqual({ vaults: [vault], nextPageToken: undefined });
      expect(Analytics.trackAction).toHaveBeenCalledWith({ action: "list_vaults" });
    });

    it("should pass pagination options and return the next page token", async () => {
      const listVaultsMock = CdpOpenApiClient.listVaults as MockedFunction<
        typeof CdpOpenApiClient.listVaults
      >;
      listVaultsMock.mockResolvedValue({ vaults: [vault], nextPageToken: "next-page" });

      const result = await client.listVaults({ pageSize: 10, pageToken: "this-page" });

      expect(listVaultsMock).toHaveBeenCalledWith({ pageSize: 10, pageToken: "this-page" });
      expect(result).toEqual({ vaults: [vault], nextPageToken: "next-page" });
    });

    it("should track and rethrow errors", async () => {
      const error = new Error("list failed");
      const listVaultsMock = CdpOpenApiClient.listVaults as MockedFunction<
        typeof CdpOpenApiClient.listVaults
      >;
      listVaultsMock.mockRejectedValue(error);

      await expect(client.listVaults()).rejects.toThrow(error);
      expect(Analytics.trackError).toHaveBeenCalledWith(error, "listVaults");
    });
  });

  describe("getVault", () => {
    it("should get a vault by ID", async () => {
      const getVaultMock = CdpOpenApiClient.getVault as MockedFunction<
        typeof CdpOpenApiClient.getVault
      >;
      getVaultMock.mockResolvedValue(vault);

      const result = await client.getVault({ vaultId: vault.vaultId });

      expect(getVaultMock).toHaveBeenCalledWith(vault.vaultId);
      expect(result).toEqual(vault);
      expect(Analytics.trackAction).toHaveBeenCalledWith({ action: "get_vault" });
    });

    it("should track and rethrow errors", async () => {
      const error = new Error("not found");
      const getVaultMock = CdpOpenApiClient.getVault as MockedFunction<
        typeof CdpOpenApiClient.getVault
      >;
      getVaultMock.mockRejectedValue(error);

      await expect(client.getVault({ vaultId: vault.vaultId })).rejects.toThrow(error);
      expect(Analytics.trackError).toHaveBeenCalledWith(error, "getVault");
    });

    it.each(["../../end-users", "vault_../../end-users", "not-a-vault-id", ""])(
      "should reject invalid vault ID %j without calling the API",
      async vaultId => {
        const getVaultMock = CdpOpenApiClient.getVault as MockedFunction<
          typeof CdpOpenApiClient.getVault
        >;

        await expect(client.getVault({ vaultId })).rejects.toThrow(UserInputValidationError);
        expect(getVaultMock).not.toHaveBeenCalled();
      },
    );
  });
});
