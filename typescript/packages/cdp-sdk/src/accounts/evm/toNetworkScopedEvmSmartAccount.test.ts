import { describe, expect, it, vi, beforeEach } from "vitest";

import { toNetworkScopedEvmSmartAccount } from "./toNetworkScopedEvmSmartAccount.js";
import type { CdpOpenApiClientType } from "../../openapi-client/index.js";
import type { EvmAccount, EvmSmartAccount } from "./types.js";
import type { Address, Hex } from "../../types/misc.js";
import type { PaymentRequired } from "@x402/core/types";

const ERC6492_MAGIC_SUFFIX = "6492649264926492649264926492649264926492649264926492649264926492";

const { mockGetCode } = vi.hoisted(() => ({ mockGetCode: vi.fn() }));

// Mock the required modules
vi.mock("./getBaseNodeRpcUrl.js");
vi.mock("../../actions/evm/sendUserOperation.js");
vi.mock("../../actions/evm/transfer/transfer.js");
vi.mock("../../actions/evm/swap/sendSwapOperation.js");
vi.mock("./resolveViemClients.js", () => ({
  resolveViemClients: vi.fn().mockResolvedValue({
    publicClient: { getCode: mockGetCode },
    chain: { id: 8453 },
    walletClient: {},
  }),
}));
vi.mock("../../actions/evm/signAndWrapTypedDataForSmartAccount.js", () => ({
  signAndWrapTypedDataForSmartAccount: vi.fn(),
}));

// Import mocked functions to use in tests
import { getBaseNodeRpcUrl } from "./getBaseNodeRpcUrl.js";
import { sendUserOperation } from "../../actions/evm/sendUserOperation.js";
import { transfer } from "../../actions/evm/transfer/transfer.js";
import { sendSwapOperation } from "../../actions/evm/swap/sendSwapOperation.js";
import { resolveViemClients } from "./resolveViemClients.js";
import { signAndWrapTypedDataForSmartAccount } from "../../actions/evm/signAndWrapTypedDataForSmartAccount.js";

describe("toNetworkScopedEvmSmartAccount", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Mock setup
  const mockOwnerAddress = "0x0000000000000000000000000000000000000001" as Address;

  const mockSmartAccount = {
    address: "0x123" as Address,
    name: "test",
    owners: [{ address: mockOwnerAddress }],
    type: "evm-smart",
    signX402Payment: vi.fn().mockResolvedValue({
      x402Version: 2,
      resource: { url: "https://example.com" },
      accepted: {},
      payload: {},
    }),
  } as unknown as EvmSmartAccount;

  const mockOwner = {
    address: mockOwnerAddress,
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
    it("should always include signX402Payment", async () => {
      const account = await toNetworkScopedEvmSmartAccount(mockApiClient, {
        smartAccount: mockSmartAccount,
        network: "polygon",
        owner: mockOwner,
      });

      expect(account.signX402Payment).toBeDefined();
      expect(typeof account.signX402Payment).toBe("function");
    });

    it("should delegate signX402Payment to the base smart account", async () => {
      const account = await toNetworkScopedEvmSmartAccount(mockApiClient, {
        smartAccount: mockSmartAccount,
        network: "polygon",
        owner: mockOwner,
      });
      const paymentRequired: PaymentRequired = {
        x402Version: 2,
        resource: { url: "https://example.com/report" },
        accepts: [],
      };

      await account.signX402Payment(paymentRequired, 3);

      expect(mockSmartAccount.signX402Payment).toHaveBeenCalledWith(paymentRequired, 3);
    });

    it("throws when acceptedIndex targets a network that does not match the scoped network", async () => {
      const account = await toNetworkScopedEvmSmartAccount(mockApiClient, {
        smartAccount: mockSmartAccount,
        network: "base",
        owner: mockOwner,
      });

      const wrongNetworkPayment: PaymentRequired = {
        x402Version: 2,
        resource: { url: "https://example.com/report" },
        accepts: [
          {
            scheme: "exact",
            network: "eip155:137", // polygon, not base (eip155:8453)
            asset: "0xasset" as `0x${string}`,
            amount: "1000",
            payTo: "0xpayto" as `0x${string}`,
            maxTimeoutSeconds: 60,
            extra: {},
          },
        ],
      };

      await expect(account.signX402Payment(wrongNetworkPayment, 0)).rejects.toThrow(
        'targets network "eip155:137" but this account is scoped to "base" (eip155:8453)',
      );
      expect(mockSmartAccount.signX402Payment).not.toHaveBeenCalled();
    });

    it("delegates when acceptedIndex targets the scoped network", async () => {
      const account = await toNetworkScopedEvmSmartAccount(mockApiClient, {
        smartAccount: mockSmartAccount,
        network: "base",
        owner: mockOwner,
      });

      const matchingPayment: PaymentRequired = {
        x402Version: 2,
        resource: { url: "https://example.com/report" },
        accepts: [
          {
            scheme: "exact",
            network: "eip155:8453",
            asset: "0xasset" as `0x${string}`,
            amount: "1000",
            payTo: "0xpayto" as `0x${string}`,
            maxTimeoutSeconds: 60,
            extra: {},
          },
        ],
      };

      await account.signX402Payment(matchingPayment, 0);
      expect(mockSmartAccount.signX402Payment).toHaveBeenCalledWith(matchingPayment, 0);
    });

    it("validates the payment network using the chain resolved from an RPC URL scope", async () => {
      // The mock resolves resolveViemClients to chain 8453 (Base) regardless of input.
      // The payment targets "eip155:8453", so it matches the resolved scope — no error.
      const account = await toNetworkScopedEvmSmartAccount(mockApiClient, {
        smartAccount: mockSmartAccount,
        network: "https://custom-rpc.example.com",
        owner: mockOwner,
      });

      const matchingPayment: PaymentRequired = {
        x402Version: 2,
        resource: { url: "https://example.com/report" },
        accepts: [
          {
            scheme: "exact",
            network: "eip155:8453",
            asset: "0xasset" as `0x${string}`,
            amount: "1000",
            payTo: "0xpayto" as `0x${string}`,
            maxTimeoutSeconds: 60,
            extra: {},
          },
        ],
      };

      await account.signX402Payment(matchingPayment, 0);
      expect(mockSmartAccount.signX402Payment).toHaveBeenCalledWith(matchingPayment, 0);
    });

    it("rejects a payment for a mismatched network even when the scope is an RPC URL", async () => {
      // The mock resolves to chain 8453 (Base). A payment targeting "eip155:137"
      // (Polygon) must be rejected — the RPC URL scope does not bypass the guard.
      const account = await toNetworkScopedEvmSmartAccount(mockApiClient, {
        smartAccount: mockSmartAccount,
        network: "https://custom-rpc.example.com",
        owner: mockOwner,
      });

      const wrongNetworkPayment: PaymentRequired = {
        x402Version: 2,
        resource: { url: "https://example.com/report" },
        accepts: [
          {
            scheme: "exact",
            network: "eip155:137", // Polygon — does not match Base (eip155:8453)
            asset: "0xasset" as `0x${string}`,
            amount: "1000",
            payTo: "0xpayto" as `0x${string}`,
            maxTimeoutSeconds: 60,
            extra: {},
          },
        ],
      };

      await expect(account.signX402Payment(wrongNetworkPayment, 0)).rejects.toThrow(
        'targets network "eip155:137" but this account is scoped to "https://custom-rpc.example.com" (eip155:8453)',
      );
      expect(mockSmartAccount.signX402Payment).not.toHaveBeenCalled();
    });

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
        expect(account.swap).toBeDefined();
        expect(account.useSpendPermission).toBeDefined();

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
        expect(account.useSpendPermission).toBeDefined();

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
        expect(account.swap).toBeDefined();
        expect(account.useSpendPermission).toBeDefined();

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
        expect(account.useSpendPermission).toBeDefined();

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
      expect(account).toHaveProperty("swap");
      expect(account).toHaveProperty("useSpendPermission");
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
      expect(account).toHaveProperty("useSpendPermission");
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

  describe("signTypedData", () => {
    const mockSignature = "0xabcdef1234567890" as Hex;
    const mockTypedData = {
      domain: {
        name: "Test Domain",
        version: "1",
        chainId: 8453,
        verifyingContract: "0x1234567890abcdef" as Address,
      },
      types: {
        TestMessage: [
          { name: "from", type: "address" },
          { name: "value", type: "uint256" },
        ],
      },
      primaryType: "TestMessage",
      message: {
        from: mockOwnerAddress,
        value: "1000000",
      },
    };

    beforeEach(() => {
      vi.clearAllMocks();
      vi.mocked(signAndWrapTypedDataForSmartAccount).mockResolvedValue({
        signature: mockSignature,
      });
      vi.mocked(resolveViemClients).mockResolvedValue({
        publicClient: { getCode: mockGetCode } as never,
        chain: { id: 8453 } as never,
        walletClient: {} as never,
      });
      // Default: account is deployed
      mockGetCode.mockResolvedValue("0x1234");
    });

    it("should always include signTypedData method", async () => {
      const account = await toNetworkScopedEvmSmartAccount(mockApiClient, {
        smartAccount: mockSmartAccount,
        network: "base",
        owner: mockOwner,
      });

      expect(account.signTypedData).toBeDefined();
      expect(typeof account.signTypedData).toBe("function");
    });

    it("should return raw signature when account is deployed", async () => {
      mockGetCode.mockResolvedValue("0xdeadbeef");

      const account = await toNetworkScopedEvmSmartAccount(mockApiClient, {
        smartAccount: mockSmartAccount,
        network: "base",
        owner: mockOwner,
      });

      const result = await account.signTypedData(mockTypedData);

      expect(result).toBe(mockSignature);
      expect(result.toLowerCase()).not.toContain(ERC6492_MAGIC_SUFFIX);
    });

    it("should return EIP-6492 wrapped signature when account is not deployed", async () => {
      mockGetCode.mockResolvedValue(undefined);

      const account = await toNetworkScopedEvmSmartAccount(mockApiClient, {
        smartAccount: mockSmartAccount,
        network: "base",
        owner: mockOwner,
      });

      const result = await account.signTypedData(mockTypedData);

      expect(result.toLowerCase()).toContain(ERC6492_MAGIC_SUFFIX);
    });

    it("should return EIP-6492 wrapped signature when getCode returns 0x", async () => {
      mockGetCode.mockResolvedValue("0x");

      const account = await toNetworkScopedEvmSmartAccount(mockApiClient, {
        smartAccount: mockSmartAccount,
        network: "base",
        owner: mockOwner,
      });

      const result = await account.signTypedData(mockTypedData);

      expect(result.toLowerCase()).toContain(ERC6492_MAGIC_SUFFIX);
    });

    it("should call resolveViemClients with the network option", async () => {
      const account = await toNetworkScopedEvmSmartAccount(mockApiClient, {
        smartAccount: mockSmartAccount,
        network: "base-sepolia",
        owner: mockOwner,
      });

      await account.signTypedData(mockTypedData);

      expect(resolveViemClients).toHaveBeenCalledWith(
        expect.objectContaining({ networkOrNodeUrl: "base-sepolia" }),
      );
    });

    it("should pass custom RPC URL to resolveViemClients", async () => {
      const customRpcUrl = "https://my-custom-rpc.example.com";

      const account = await toNetworkScopedEvmSmartAccount(mockApiClient, {
        smartAccount: mockSmartAccount,
        network: customRpcUrl,
        owner: mockOwner,
      });

      await account.signTypedData(mockTypedData);

      expect(resolveViemClients).toHaveBeenCalledWith(
        expect.objectContaining({ networkOrNodeUrl: customRpcUrl }),
      );
    });

    it("should call signAndWrapTypedDataForSmartAccount with chain id from resolveViemClients", async () => {
      vi.mocked(resolveViemClients).mockResolvedValue({
        publicClient: { getCode: mockGetCode } as never,
        chain: { id: 84532 } as never,
        walletClient: {} as never,
      });

      const account = await toNetworkScopedEvmSmartAccount(mockApiClient, {
        smartAccount: mockSmartAccount,
        network: "base-sepolia",
        owner: mockOwner,
      });

      await account.signTypedData(mockTypedData);

      expect(signAndWrapTypedDataForSmartAccount).toHaveBeenCalledWith(
        mockApiClient,
        expect.objectContaining({
          chainId: 84532n,
          smartAccount: mockSmartAccount,
          typedData: mockTypedData,
        }),
      );
    });
  });
});
