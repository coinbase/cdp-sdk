import { describe, it, expect, vi, beforeEach } from "vitest";

import { redeemVaultFees, redeemVaultFeesWithSmartAccount } from "./redeemVaultFees.js";
import { lendApiClient } from "../../client/vendored.js";

import type { Address } from "../../types/misc.js";

vi.mock("../../client/vendored.js", async importOriginal => {
  return {
    ...(await importOriginal<typeof import("../../client/vendored.js")>()),
    lendApiClient: {
      redeemVaultFeesWithEvmAccount: vi.fn(),
      redeemVaultFeesWithEvmSmartAccount: vi.fn(),
    },
  };
});

const address = "0x742d35Cc6634C0532925a3b844Bc454e4438f44e" as Address;
const vaultId = "vault_019f5f10-096a-7a23-86df-f479650d813f";
const transactionHash = "0xf8f98fb6726fc936f24b2007df5cb20e2b8444ff3dfaa2a929335f432a9be2e7";
const userOpHash = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";

describe("redeemVaultFees", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(lendApiClient.redeemVaultFeesWithEvmAccount).mockResolvedValue({
      transactionHash,
    } as never);
    vi.mocked(lendApiClient.redeemVaultFeesWithEvmSmartAccount).mockResolvedValue({
      userOpHash,
    } as never);
  });

  it("redeems fees with an EVM account", async () => {
    const result = await redeemVaultFees({
      address,
      vaultId,
      maxSlippageBps: 50,
      idempotencyKey: "idem-key",
    });

    expect(lendApiClient.redeemVaultFeesWithEvmAccount).toHaveBeenCalledWith({
      address,
      idempotencyKey: "idem-key",
      vaultId,
      maxSlippageBps: 50,
    });
    expect(result).toEqual({ transactionHash });
  });

  it("omits optional fields for an EVM account", async () => {
    await redeemVaultFees({ address, vaultId });

    expect(lendApiClient.redeemVaultFeesWithEvmAccount).toHaveBeenCalledWith({
      address,
      idempotencyKey: undefined,
      vaultId,
      maxSlippageBps: undefined,
    });
  });

  it("redeems fees with an EVM smart account", async () => {
    const paymasterContext = { policyId: "policy-123" };

    const result = await redeemVaultFeesWithSmartAccount({
      address,
      vaultId,
      maxSlippageBps: 25,
      paymasterUrl: "https://paymaster.example.com",
      paymasterContext,
      idempotencyKey: "idem-key",
    });

    expect(lendApiClient.redeemVaultFeesWithEvmSmartAccount).toHaveBeenCalledWith({
      address,
      idempotencyKey: "idem-key",
      vaultId,
      maxSlippageBps: 25,
      useCdpPaymaster: undefined,
      paymasterUrl: "https://paymaster.example.com",
      paymasterContext,
    });
    expect(result).toEqual({
      smartAccountAddress: address,
      status: "broadcast",
      userOpHash,
    });
  });

  it("passes useCdpPaymaster for an EVM smart account", async () => {
    await redeemVaultFeesWithSmartAccount({ address, vaultId, useCdpPaymaster: true });

    expect(lendApiClient.redeemVaultFeesWithEvmSmartAccount).toHaveBeenCalledWith({
      address,
      idempotencyKey: undefined,
      vaultId,
      maxSlippageBps: undefined,
      useCdpPaymaster: true,
      paymasterUrl: undefined,
      paymasterContext: undefined,
    });
  });

  it("propagates API errors", async () => {
    const error = new Error("No fee shares to redeem.");
    vi.mocked(lendApiClient.redeemVaultFeesWithEvmAccount).mockRejectedValueOnce(error);

    await expect(redeemVaultFees({ address, vaultId })).rejects.toThrow(error);
  });

  it("propagates API errors for an EVM smart account", async () => {
    const error = new Error("No fee shares to redeem.");
    vi.mocked(lendApiClient.redeemVaultFeesWithEvmSmartAccount).mockRejectedValueOnce(error);

    await expect(redeemVaultFeesWithSmartAccount({ address, vaultId })).rejects.toBe(error);
  });
});
