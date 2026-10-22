import { describe, it, expect, vi, beforeEach } from "vitest";

import { redeemVaultFees, redeemVaultFeesWithSmartAccount } from "./redeemVaultFees.js";

import type { CdpOpenApiClientType } from "../../openapi-client/index.js";
import type { Address } from "../../types/misc.js";

const address = "0x742d35Cc6634C0532925a3b844Bc454e4438f44e" as Address;
const vaultId = "vault_019f5f10-096a-7a23-86df-f479650d813f";
const transactionHash = "0xf8f98fb6726fc936f24b2007df5cb20e2b8444ff3dfaa2a929335f432a9be2e7";
const userOpHash = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";

describe("redeemVaultFees", () => {
  let apiClient: CdpOpenApiClientType;

  beforeEach(() => {
    apiClient = {
      redeemVaultFeesWithEvmAccount: vi.fn().mockResolvedValue({ transactionHash }),
      redeemVaultFeesWithEvmSmartAccount: vi.fn().mockResolvedValue({ userOpHash }),
    } as unknown as CdpOpenApiClientType;
  });

  it("redeems fees with an EVM account", async () => {
    const result = await redeemVaultFees(apiClient, {
      address,
      vaultId,
      maxSlippageBps: 50,
      idempotencyKey: "idem-key",
    });

    expect(apiClient.redeemVaultFeesWithEvmAccount).toHaveBeenCalledWith(
      address,
      { vaultId, maxSlippageBps: 50 },
      "idem-key",
    );
    expect(result).toEqual({ transactionHash });
  });

  it("omits optional fields for an EVM account", async () => {
    await redeemVaultFees(apiClient, { address, vaultId });

    expect(apiClient.redeemVaultFeesWithEvmAccount).toHaveBeenCalledWith(
      address,
      { vaultId, maxSlippageBps: undefined },
      undefined,
    );
  });

  it("redeems fees with an EVM smart account", async () => {
    const paymasterContext = { policyId: "policy-123" };

    const result = await redeemVaultFeesWithSmartAccount(apiClient, {
      address,
      vaultId,
      maxSlippageBps: 25,
      paymasterUrl: "https://paymaster.example.com",
      paymasterContext,
      idempotencyKey: "idem-key",
    });

    expect(apiClient.redeemVaultFeesWithEvmSmartAccount).toHaveBeenCalledWith(
      address,
      {
        vaultId,
        maxSlippageBps: 25,
        useCdpPaymaster: undefined,
        paymasterUrl: "https://paymaster.example.com",
        paymasterContext,
      },
      "idem-key",
    );
    expect(result).toEqual({
      smartAccountAddress: address,
      status: "broadcast",
      userOpHash,
    });
  });

  it("passes useCdpPaymaster for an EVM smart account", async () => {
    await redeemVaultFeesWithSmartAccount(apiClient, { address, vaultId, useCdpPaymaster: true });

    expect(apiClient.redeemVaultFeesWithEvmSmartAccount).toHaveBeenCalledWith(
      address,
      {
        vaultId,
        maxSlippageBps: undefined,
        useCdpPaymaster: true,
        paymasterUrl: undefined,
        paymasterContext: undefined,
      },
      undefined,
    );
  });

  it("propagates API errors", async () => {
    const error = new Error("No fee shares to redeem.");
    vi.mocked(apiClient.redeemVaultFeesWithEvmAccount).mockRejectedValueOnce(error);

    await expect(redeemVaultFees(apiClient, { address, vaultId })).rejects.toThrow(error);
  });

  it("propagates API errors for an EVM smart account", async () => {
    const error = new Error("No fee shares to redeem.");
    vi.mocked(apiClient.redeemVaultFeesWithEvmSmartAccount).mockRejectedValueOnce(error);

    await expect(redeemVaultFeesWithSmartAccount(apiClient, { address, vaultId })).rejects.toBe(
      error,
    );
  });
});
