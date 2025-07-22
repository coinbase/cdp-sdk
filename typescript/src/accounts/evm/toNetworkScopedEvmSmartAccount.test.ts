import { describe, expect, it, vi, beforeEach } from "vitest";

import { toNetworkScopedEvmSmartAccount } from "./toNetworkScopedEvmSmartAccount.js";
import type { CdpOpenApiClientType } from "../../openapi-client/index.js";
import type { EvmAccount, EvmSmartAccount } from "./types.js";
import type { Address } from "../../types/misc.js";

// Mock the required modules
vi.mock("./getBaseNodeRpcUrl.js");
vi.mock("../../actions/evm/sendUserOperation.js");
vi.mock("../../actions/evm/transfer/transfer.js");
vi.mock("../../actions/evm/swap/sendSwapOperation.js");

// Import mocked functions to use in tests
import { getBaseNodeRpcUrl } from "./getBaseNodeRpcUrl.js";
import { sendUserOperation } from "../../actions/evm/sendUserOperation.js";
import { transfer } from "../../actions/evm/transfer/transfer.js";
import { sendSwapOperation } from "../../actions/evm/swap/sendSwapOperation.js";

describe("toNetworkScopedEvmSmartAccount", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Mock setup
  const mockSmartAccount = {
    address: "0x123" as Address,
    name: "test",
    owners: [],
    type: "evm-smart",
  } as unknown as EvmSmartAccount;

  const mockOwner = {
    address: "0x456" as Address,
    type: "evm",
  } as unknown as EvmAccount;

  const mockApiClient = {} as unknown as CdpOpenApiClientType;

  describe("basic properties", () => {
    it("should include network in the returned object", async () => {
      const networkScopedSmartAccount = await toNetworkScopedEvmSmartAccount(mockApiClient, {
        smartAccount: mockSmartAccount,
        network: "base",
        owner: mockOwner,
      });

      expect(networkScopedSmartAccount.network).toBe("base");
    });

    it("should include address from smart account", async () => {
      const networkScopedSmartAccount = await toNetworkScopedEvmSmartAccount(mockApiClient, {
        smartAccount: mockSmartAccount,
        network: "base",
        owner: mockOwner,
      });

      expect(networkScopedSmartAccount.address).toBe("0x123");
    });

    it("should include name from smart account", async () => {
      const networkScopedSmartAccount = await toNetworkScopedEvmSmartAccount(mockApiClient, {
        smartAccount: mockSmartAccount,
        network: "base",
        owner: mockOwner,
      });

      expect(networkScopedSmartAccount.name).toBe("test");
    });

    it("should set type to evm-smart", async () => {
      const networkScopedSmartAccount = await toNetworkScopedEvmSmartAccount(mockApiClient, {
        smartAccount: mockSmartAccount,
        network: "base",
        owner: mockOwner,
      });

      expect(networkScopedSmartAccount.type).toBe("evm-smart");
    });

    it("should include owner in owners array", async () => {
      const networkScopedSmartAccount = await toNetworkScopedEvmSmartAccount(mockApiClient, {
        smartAccount: mockSmartAccount,
        network: "base",
        owner: mockOwner,
      });

      expect(networkScopedSmartAccount.owners).toEqual([mockOwner]);
    });
  });

  describe("always available methods", () => {
    it("should always include sendUserOperation", async () => {
      const account = await toNetworkScopedEvmSmartAccount(mockApiClient, {
        smartAccount: mockSmartAccount,
        network: "polygon",
        owner: mockOwner,
      });

      expect(account.sendUserOperation).toBeDefined();
      expect(typeof account.sendUserOperation).toBe("function");
    });

    it("should always include waitForUserOperation", async () => {
      const account = await toNetworkScopedEvmSmartAccount(mockApiClient, {
        smartAccount: mockSmartAccount,
        network: "polygon",
        owner: mockOwner,
      });

      expect(account.waitForUserOperation).toBeDefined();
      expect(typeof account.waitForUserOperation).toBe("function");
    });

    it("should always include getUserOperation", async () => {
      const account = await toNetworkScopedEvmSmartAccount(mockApiClient, {
        smartAccount: mockSmartAccount,
        network: "polygon",
        owner: mockOwner,
      });

      expect(account.getUserOperation).toBeDefined();
      expect(typeof account.getUserOperation).toBe("function");
    });
  });

  describe("network-specific method availability", () => {
    describe("base network", () => {
      it("should include all supported methods on base", async () => {
        const account = await toNetworkScopedEvmSmartAccount(mockApiClient, {
          smartAccount: mockSmartAccount,
          network: "base",
          owner: mockOwner,
        });

        // Should have these methods
        expect(account.listTokenBalances).toBeDefined();
        expect(account.transfer).toBeDefined();
        expect(account.quoteFund).toBeDefined();
        expect(account.fund).toBeDefined();
        expect(account.waitForFundOperationReceipt).toBeDefined();
        expect(account.quoteSwap).toBeDefined();
        expect(account.swap).toBeDefined();

        // Should NOT have requestFaucet (only on testnets)
        expect(account).not.toHaveProperty("requestFaucet");
      });
    });

    describe("base-sepolia network", () => {
      it("should include testnet-specific methods on base-sepolia", async () => {
        const account = await toNetworkScopedEvmSmartAccount(mockApiClient, {
          smartAccount: mockSmartAccount,
          network: "base-sepolia",
          owner: mockOwner,
        });

        // Should have these methods
        expect(account.listTokenBalances).toBeDefined();
        expect(account.transfer).toBeDefined();
        expect(account.requestFaucet).toBeDefined();

        // Should NOT have mainnet-only methods
        expect(account).not.toHaveProperty("quoteFund");
        expect(account).not.toHaveProperty("fund");
        expect(account).not.toHaveProperty("waitForFundOperationReceipt");
        expect(account).not.toHaveProperty("quoteSwap");
        expect(account).not.toHaveProperty("swap");
      });
    });

    describe("ethereum network", () => {
      it("should include ethereum-specific methods", async () => {
        const account = await toNetworkScopedEvmSmartAccount(mockApiClient, {
          smartAccount: mockSmartAccount,
          network: "ethereum",
          owner: mockOwner,
        });

        // Should have these methods
        expect(account.listTokenBalances).toBeDefined();
        expect(account.transfer).toBeDefined();
        expect(account.quoteSwap).toBeDefined();
        expect(account.swap).toBeDefined();

        // Should NOT have base-only methods or testnet methods
        expect(account).not.toHaveProperty("quoteFund");
        expect(account).not.toHaveProperty("fund");
        expect(account).not.toHaveProperty("waitForFundOperationReceipt");
        expect(account).not.toHaveProperty("requestFaucet");
      });
    });

    describe("ethereum-sepolia network", () => {
      it("should include ethereum-sepolia-specific methods", async () => {
        const account = await toNetworkScopedEvmSmartAccount(mockApiClient, {
          smartAccount: mockSmartAccount,
          network: "ethereum-sepolia",
          owner: mockOwner,
        });

        // Should have these methods
        expect(account.transfer).toBeDefined();
        expect(account.requestFaucet).toBeDefined();

        // Should NOT have these methods
        expect(account).not.toHaveProperty("listTokenBalances");
        expect(account).not.toHaveProperty("quoteFund");
        expect(account).not.toHaveProperty("fund");
        expect(account).not.toHaveProperty("waitForFundOperationReceipt");
        expect(account).not.toHaveProperty("quoteSwap");
        expect(account).not.toHaveProperty("swap");
      });
    });
  });

  describe("type safety", () => {
    it("should return correct type for base network", async () => {
      const account = await toNetworkScopedEvmSmartAccount(mockApiClient, {
        smartAccount: mockSmartAccount,
        network: "base",
        owner: mockOwner,
      });

      // TypeScript should know these methods exist
      expect(account).toHaveProperty("listTokenBalances");
      expect(account).toHaveProperty("transfer");
      expect(account).toHaveProperty("quoteFund");
      expect(account).toHaveProperty("fund");
      expect(account).toHaveProperty("waitForFundOperationReceipt");
      expect(account).toHaveProperty("quoteSwap");
      expect(account).toHaveProperty("swap");
    });

    it("should return correct type for ethereum network", async () => {
      const account = await toNetworkScopedEvmSmartAccount(mockApiClient, {
        smartAccount: mockSmartAccount,
        network: "ethereum",
        owner: mockOwner,
      });

      // TypeScript should know these methods exist
      expect(account).toHaveProperty("listTokenBalances");
      expect(account).toHaveProperty("transfer");
      expect(account).toHaveProperty("quoteSwap");
      expect(account).toHaveProperty("swap");
    });
  });

  describe("paymasterUrl functionality", () => {
    const mockPaymasterUrl = "https://paymaster.base.org";

    beforeEach(() => {
      // Mock getBaseNodeRpcUrl to return a test URL
      vi.mocked(getBaseNodeRpcUrl).mockResolvedValue(mockPaymasterUrl);
    });

    describe("base network", () => {
      it("should call getBaseNodeRpcUrl for base network", async () => {
        await toNetworkScopedEvmSmartAccount(mockApiClient, {
          smartAccount: mockSmartAccount,
          network: "base",
          owner: mockOwner,
        });

        expect(getBaseNodeRpcUrl).toHaveBeenCalledWith("base");
      });

      it("should use default paymasterUrl in sendUserOperation when not provided", async () => {
        const account = await toNetworkScopedEvmSmartAccount(mockApiClient, {
          smartAccount: mockSmartAccount,
          network: "base",
          owner: mockOwner,
        });

        await account.sendUserOperation({
          calls: [
            {
              to: "0x789" as Address,
              value: 100n,
              data: "0x",
            },
          ],
        });

        expect(sendUserOperation).toHaveBeenCalledWith(
          mockApiClient,
          expect.objectContaining({
            paymasterUrl: mockPaymasterUrl,
            smartAccount: mockSmartAccount,
            network: "base",
          }),
        );
      });

      it("should use user-provided paymasterUrl in sendUserOperation when provided", async () => {
        const customPaymasterUrl = "https://custom.paymaster.org";
        const account = await toNetworkScopedEvmSmartAccount(mockApiClient, {
          smartAccount: mockSmartAccount,
          network: "base",
          owner: mockOwner,
        });

        await account.sendUserOperation({
          calls: [
            {
              to: "0x789" as Address,
              value: 100n,
              data: "0x",
            },
          ],
          paymasterUrl: customPaymasterUrl,
        });

        expect(sendUserOperation).toHaveBeenCalledWith(
          mockApiClient,
          expect.objectContaining({
            paymasterUrl: customPaymasterUrl,
            smartAccount: mockSmartAccount,
            network: "base",
          }),
        );
      });

      it("should use default paymasterUrl in transfer when not provided", async () => {
        const account = await toNetworkScopedEvmSmartAccount(mockApiClient, {
          smartAccount: mockSmartAccount,
          network: "base",
          owner: mockOwner,
        });

        await account.transfer({
          to: "0x789" as Address,
          amount: 100n,
          token: "eth",
        });

        expect(transfer).toHaveBeenCalledWith(
          mockApiClient,
          mockSmartAccount,
          expect.objectContaining({
            paymasterUrl: mockPaymasterUrl,
            network: "base",
            to: "0x789" as Address,
            token: "eth",
          }),
          { executeTransfer: expect.any(Function) },
        );
      });

      it("should use user-provided paymasterUrl in transfer when provided", async () => {
        const customPaymasterUrl = "https://custom.paymaster.org";
        const account = await toNetworkScopedEvmSmartAccount(mockApiClient, {
          smartAccount: mockSmartAccount,
          network: "base",
          owner: mockOwner,
        });

        await account.transfer({
          to: "0x789" as Address,
          amount: 100n,
          token: "eth",
          paymasterUrl: customPaymasterUrl,
        });

        expect(transfer).toHaveBeenCalledWith(
          mockApiClient,
          mockSmartAccount,
          expect.objectContaining({
            amount: 100n,
            to: "0x789" as Address,
            token: "eth",
            paymasterUrl: customPaymasterUrl,
            network: "base",
          }),
          { executeTransfer: expect.any(Function) },
        );
      });

      it("should use default paymasterUrl in swap when not provided", async () => {
        const account = await toNetworkScopedEvmSmartAccount(mockApiClient, {
          smartAccount: mockSmartAccount,
          network: "base",
          owner: mockOwner,
        });

        await account.swap({
          fromToken: "0x0000000000000000000000000000000000000000" as Address,
          toToken: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" as Address,
          fromAmount: 100n,
        });

        expect(sendSwapOperation).toHaveBeenCalledWith(
          mockApiClient,
          expect.objectContaining({
            paymasterUrl: mockPaymasterUrl,
            smartAccount: mockSmartAccount,
            network: "base",
            taker: mockSmartAccount.address,
            signerAddress: mockOwner.address,
          }),
        );
      });

      it("should use user-provided paymasterUrl in swap when provided", async () => {
        const customPaymasterUrl = "https://custom.paymaster.org";
        const account = await toNetworkScopedEvmSmartAccount(mockApiClient, {
          smartAccount: mockSmartAccount,
          network: "base",
          owner: mockOwner,
        });

        await account.swap({
          fromToken: "0x0000000000000000000000000000000000000000" as Address,
          toToken: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" as Address,
          fromAmount: 100n,
          paymasterUrl: customPaymasterUrl,
        });

        expect(sendSwapOperation).toHaveBeenCalledWith(
          mockApiClient,
          expect.objectContaining({
            paymasterUrl: customPaymasterUrl,
            smartAccount: mockSmartAccount,
            network: "base",
            taker: mockSmartAccount.address,
            signerAddress: mockOwner.address,
          }),
        );
      });
    });

    describe("non-base networks", () => {
      it("should not call getBaseNodeRpcUrl for ethereum network", async () => {
        await toNetworkScopedEvmSmartAccount(mockApiClient, {
          smartAccount: mockSmartAccount,
          network: "ethereum",
          owner: mockOwner,
        });

        expect(getBaseNodeRpcUrl).not.toHaveBeenCalled();
      });

      it("should not set default paymasterUrl for ethereum network", async () => {
        const account = await toNetworkScopedEvmSmartAccount(mockApiClient, {
          smartAccount: mockSmartAccount,
          network: "ethereum",
          owner: mockOwner,
        });

        await account.sendUserOperation({
          calls: [
            {
              to: "0x789" as Address,
              value: 100n,
              data: "0x",
            },
          ],
        });

        expect(sendUserOperation).toHaveBeenCalledWith(
          mockApiClient,
          expect.objectContaining({
            paymasterUrl: undefined,
            smartAccount: mockSmartAccount,
            network: "ethereum",
          }),
        );
      });

      it("should still respect user-provided paymasterUrl on non-base networks", async () => {
        const customPaymasterUrl = "https://custom.paymaster.org";
        const account = await toNetworkScopedEvmSmartAccount(mockApiClient, {
          smartAccount: mockSmartAccount,
          network: "ethereum",
          owner: mockOwner,
        });

        await account.sendUserOperation({
          calls: [
            {
              to: "0x789" as Address,
              value: 100n,
              data: "0x",
            },
          ],
          paymasterUrl: customPaymasterUrl,
        });

        expect(sendUserOperation).toHaveBeenCalledWith(
          mockApiClient,
          expect.objectContaining({
            paymasterUrl: customPaymasterUrl,
            smartAccount: mockSmartAccount,
            network: "ethereum",
          }),
        );
      });

      it("should not set default paymasterUrl for polygon network", async () => {
        await toNetworkScopedEvmSmartAccount(mockApiClient, {
          smartAccount: mockSmartAccount,
          network: "polygon",
          owner: mockOwner,
        });

        expect(getBaseNodeRpcUrl).not.toHaveBeenCalled();
      });
    });
  });
});
