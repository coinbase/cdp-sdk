import { describe, expect, it } from "vitest";

import { toNetworkScopedEvmSmartAccount } from "./toNetworkScopedEvmSmartAccount.js";
import type { CdpOpenApiClientType } from "../../openapi-client/index.js";
import type { EvmAccount, EvmSmartAccount } from "./types.js";
import type { Address } from "../../types/misc.js";

describe("toNetworkScopedEvmSmartAccount", () => {
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
    it("should include network in the returned object", () => {
      const networkScopedSmartAccount = toNetworkScopedEvmSmartAccount(mockApiClient, {
        smartAccount: mockSmartAccount,
        network: "base",
        owner: mockOwner,
      });

      expect(networkScopedSmartAccount.network).toBe("base");
    });

    it("should include address from smart account", () => {
      const networkScopedSmartAccount = toNetworkScopedEvmSmartAccount(mockApiClient, {
        smartAccount: mockSmartAccount,
        network: "base",
        owner: mockOwner,
      });

      expect(networkScopedSmartAccount.address).toBe("0x123");
    });

    it("should include name from smart account", () => {
      const networkScopedSmartAccount = toNetworkScopedEvmSmartAccount(mockApiClient, {
        smartAccount: mockSmartAccount,
        network: "base",
        owner: mockOwner,
      });

      expect(networkScopedSmartAccount.name).toBe("test");
    });

    it("should set type to evm-smart", () => {
      const networkScopedSmartAccount = toNetworkScopedEvmSmartAccount(mockApiClient, {
        smartAccount: mockSmartAccount,
        network: "base",
        owner: mockOwner,
      });

      expect(networkScopedSmartAccount.type).toBe("evm-smart");
    });

    it("should include owner in owners array", () => {
      const networkScopedSmartAccount = toNetworkScopedEvmSmartAccount(mockApiClient, {
        smartAccount: mockSmartAccount,
        network: "base",
        owner: mockOwner,
      });

      expect(networkScopedSmartAccount.owners).toEqual([mockOwner]);
    });
  });

  describe("always available methods", () => {
    it("should always include sendUserOperation", () => {
      const account = toNetworkScopedEvmSmartAccount(mockApiClient, {
        smartAccount: mockSmartAccount,
        network: "polygon",
        owner: mockOwner,
      });

      expect(account.sendUserOperation).toBeDefined();
      expect(typeof account.sendUserOperation).toBe("function");
    });

    it("should always include waitForUserOperation", () => {
      const account = toNetworkScopedEvmSmartAccount(mockApiClient, {
        smartAccount: mockSmartAccount,
        network: "polygon",
        owner: mockOwner,
      });

      expect(account.waitForUserOperation).toBeDefined();
      expect(typeof account.waitForUserOperation).toBe("function");
    });

    it("should always include getUserOperation", () => {
      const account = toNetworkScopedEvmSmartAccount(mockApiClient, {
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
      it("should include all supported methods on base", () => {
        const account = toNetworkScopedEvmSmartAccount(mockApiClient, {
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
      it("should include testnet-specific methods on base-sepolia", () => {
        const account = toNetworkScopedEvmSmartAccount(mockApiClient, {
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
      it("should include ethereum-specific methods", () => {
        const account = toNetworkScopedEvmSmartAccount(mockApiClient, {
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
      it("should include ethereum-sepolia-specific methods", () => {
        const account = toNetworkScopedEvmSmartAccount(mockApiClient, {
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
    it("should return correct type for base network", () => {
      const account = toNetworkScopedEvmSmartAccount(mockApiClient, {
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

    it("should return correct type for ethereum network", () => {
      const account = toNetworkScopedEvmSmartAccount(mockApiClient, {
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
});
