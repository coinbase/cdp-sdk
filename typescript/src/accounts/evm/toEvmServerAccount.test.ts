import { describe, it, expect, vi, beforeEach } from "vitest";
import { toEvmServerAccount } from "./toEvmServerAccount.js";
import { EvmAccount, EvmServerAccount } from "./types.js";
import { Address, Hash, Hex } from "../../types/misc.js";
import { parseUnits, Transaction, hashMessage, recoverAddress } from "viem";
import { transfer } from "../../actions/evm/transfer/transfer.js";
import { accountTransferStrategy } from "../../actions/evm/transfer/accountTransferStrategy.js";
import { CdpOpenApiClientType } from "../../openapi-client/index.js";
import { TransferOptions } from "../../actions/evm/transfer/types.js";
import { sendSwapTransaction } from "../../actions/evm/swap/sendSwapTransaction.js";
import { createSwapQuote } from "../../actions/evm/swap/createSwapQuote.js";
import { AccountSwapOptions } from "../../actions/evm/swap/types.js";
import { useSpendPermission } from "../../actions/evm/spend-permissions/account.use.js";

vi.mock("viem", async () => {
  const actual = await vi.importActual("viem");
  return {
    ...actual,
    serializeTransaction: vi.fn().mockReturnValue("0xserializedtx"),
  };
});

vi.mock("../../actions/evm/transfer/transfer.js", () => ({
  ...vi.importActual("../../actions/evm/transfer/transfer.js"),
  transfer: vi.fn().mockResolvedValue({ transactionHash: "0xmocktransactionhash" }),
}));

vi.mock("../../actions/evm/swap/sendSwapTransaction.js", () => ({
  sendSwapTransaction: vi.fn().mockResolvedValue({ transactionHash: "0xswaptransactionhash" }),
}));

vi.mock("../../actions/evm/swap/createSwapQuote.js", () => ({
  createSwapQuote: vi.fn().mockResolvedValue({
    liquidityAvailable: true,
    network: "base",
    toToken: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    fromToken: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    fromAmount: BigInt("1000000000000000000"),
    toAmount: BigInt("5000000000"),
    minToAmount: BigInt("4950000000"),
    blockNumber: BigInt("12345678"),
    fees: {
      gasFee: undefined,
      protocolFee: undefined,
    },
    issues: {
      allowance: undefined,
      balance: undefined,
      simulationIncomplete: false,
    },
    gas: BigInt("300000"),
    gasPrice: BigInt("1500000000"),
    transaction: {
      to: "0x000000000022D473030F116dDEE9F6B43aC78BA3",
      data: "0x12345678",
      gas: "300000",
      value: "0",
    },
    permit2: undefined,
    execute: vi.fn(),
  }),
}));

vi.mock("../../actions/evm/spend-permissions/account.use.js", () => ({
  useSpendPermission: vi.fn().mockResolvedValue({ transactionHash: "0xmocktransactionhash" }),
}));

vi.mock("./resolveViemClients.js", () => ({
  resolveViemClients: vi.fn().mockResolvedValue({
    publicClient: {
      waitForTransactionReceipt: vi.fn().mockResolvedValue({ status: "success" }),
    },
    walletClient: {
      sendTransaction: vi.fn().mockResolvedValue("0xtransactionhash"),
    },
    chain: {
      id: 8453, // base chain ID
      name: "Base",
    },
  }),
}));

vi.mock("./toNetworkScopedEvmServerAccount.js", () => ({
  toNetworkScopedEvmServerAccount: vi.fn().mockImplementation(async options => ({
    ...options.account,
    network: options.network,
    sendTransaction: options.account.sendTransaction,
    waitForTransactionReceipt: vi.fn().mockResolvedValue({ status: "success" }),
  })),
}));

describe("toEvmServerAccount", () => {
  let mockApiClient: CdpOpenApiClientType;
  let mockAccount: EvmAccount;
  let mockAddress: Address;
  let serverAccount: EvmServerAccount;

  beforeEach(() => {
    mockAddress = "0x0000000000000000000000000000000000000000" as Address;

    mockApiClient = {
      signEvmMessage: vi.fn().mockResolvedValue({ signature: "0xmocksignature" }),
      signEvmHash: vi.fn().mockResolvedValue({ signature: "0xmocksignature" }),
      signEvmTransaction: vi.fn().mockResolvedValue({ signedTransaction: "0xmocktransaction" }),
      signEvmTypedData: vi.fn().mockResolvedValue({ signature: "0xmocksignature" }),
    } as unknown as CdpOpenApiClientType;

    mockAccount = {
      address: mockAddress,
      sign: vi.fn(),
      signMessage: vi.fn(),
      signTransaction: vi.fn(),
      signTypedData: vi.fn(),
    };

    serverAccount = toEvmServerAccount(mockApiClient, {
      account: mockAccount,
    });
  });

  it("should create an EvmServerAccount with the correct structure", () => {
    const result = toEvmServerAccount(mockApiClient, {
      account: mockAccount,
    });

    expect(result).toEqual({
      address: mockAddress,
      listTokenBalances: expect.any(Function),
      requestFaucet: expect.any(Function),
      sendTransaction: expect.any(Function),
      sign: expect.any(Function),
      signMessage: expect.any(Function),
      signTransaction: expect.any(Function),
      signTypedData: expect.any(Function),
      swap: expect.any(Function),
      quoteSwap: expect.any(Function),
      transfer: expect.any(Function),
      type: "evm-server",
      useNetwork: expect.any(Function),
      useSpendPermission: expect.any(Function),
    });
  });

  it("should use the address from the provided account", () => {
    expect(serverAccount.address).toBe(mockAddress);
  });

  it("should have the correct type property", () => {
    expect(serverAccount.type).toBe("evm-server");
  });

  describe("signMessage", () => {
    it("should call apiClient.signEvmMessage for plain string", async () => {
      const message = "Hello World";

      await serverAccount.signMessage({ message });

      expect(mockApiClient.signEvmMessage).toHaveBeenCalledWith(mockAddress, {
        message,
      });
    });

    it("should call apiClient.signEvmMessage for hex-encoded string", async () => {
      const hexEncodedMessage = "0x48656c6c6f"; // hex encoded "Hello" (5 bytes)

      await serverAccount.signMessage({ message: hexEncodedMessage });

      expect(mockApiClient.signEvmMessage).toHaveBeenCalledWith(mockAddress, {
        message: hexEncodedMessage,
      });
    });

    it("should call apiClient.signEvmHash with correct hash for object format with raw hex", async () => {
      const hexMessage = "0x48656c6c6f20576f726c64" as Hex; // "Hello World" in hex
      const expectedHash = hashMessage({ raw: hexMessage });

      await serverAccount.signMessage({ message: { raw: hexMessage } });

      expect(mockApiClient.signEvmHash).toHaveBeenCalledWith(mockAddress, {
        hash: expectedHash,
      });
    });

    it("should handle binary data (32-byte hash) correctly - ZeroDev use case", async () => {
      // This is the ZeroDev use case: signing a UserOp hash
      const binaryDataHex =
        "0x69e540c217c8af830886c5a81e5c617f71fa7ab913488233406b9bfbc12b31be" as Hex;
      const expectedHash = hashMessage({ raw: binaryDataHex });

      await serverAccount.signMessage({ message: { raw: binaryDataHex } });

      expect(mockApiClient.signEvmHash).toHaveBeenCalledWith(mockAddress, {
        hash: expectedHash,
      });
    });

    it("should handle pre-hashed message (double-hash scenario)", async () => {
      const originalMessage = "Hello";
      const preHashedMessage = hashMessage(originalMessage);
      // The preHashedMessage will be wrapped with EIP-191 again when passed as object
      const expectedHash = hashMessage({ raw: preHashedMessage });

      await serverAccount.signMessage({ message: { raw: preHashedMessage } });

      expect(mockApiClient.signEvmHash).toHaveBeenCalledWith(mockAddress, {
        hash: expectedHash,
      });
    });

    it("should handle object format with Uint8Array", async () => {
      const byteArray = new Uint8Array([72, 101, 108, 108, 111]); // "Hello" in bytes
      const expectedHash = hashMessage({ raw: byteArray });

      await serverAccount.signMessage({ message: { raw: byteArray } });

      expect(mockApiClient.signEvmHash).toHaveBeenCalledWith(mockAddress, {
        hash: expectedHash,
      });
    });
  });

  it("should call apiClient.signEvmHash when sign is called", async () => {
    const hash = "0xhash123" as Hash;
    await serverAccount.sign({ hash });

    expect(mockApiClient.signEvmHash).toHaveBeenCalledWith(mockAddress, { hash });
  });

  it("should call apiClient.signEvmTransaction when signTransaction is called", async () => {
    const mockTransaction = { to: "0xrecipient" } as unknown as Transaction;

    await serverAccount.signTransaction(mockTransaction);

    expect(mockApiClient.signEvmTransaction).toHaveBeenCalledWith(mockAddress, {
      transaction: "0xserializedtx",
    });
  });

  describe("signTypedData", () => {
    it("should call apiClient.signEvmTypedData when signTypedData is called", async () => {
      const message = {
        domain: {
          name: "EIP712Domain",
          chainId: 1n,
          verifyingContract: "0x0000000000000000000000000000000000000000" as Address,
        },
        types: {
          EIP712Domain: [
            { name: "name", type: "string" },
            { name: "chainId", type: "uint256" },
            { name: "verifyingContract", type: "address" },
          ],
        },
        primaryType: "EIP712Domain",
      } as const;

      await serverAccount.signTypedData(message);

      expect(mockApiClient.signEvmTypedData).toHaveBeenCalledWith(mockAddress, message);
    });

    it("should include the EIP712Domain type if it is not provided", async () => {
      const message = {
        domain: {
          name: "EIP712Domain",
          chainId: 1,
          verifyingContract: "0x0000000000000000000000000000000000000000" as Address,
        },
        types: {},
        primaryType: "EIP712Domain",
      } as const;

      await serverAccount.signTypedData(message);

      expect(mockApiClient.signEvmTypedData).toHaveBeenCalledWith(mockAddress, {
        ...message,
        types: {
          EIP712Domain: [
            { name: "name", type: "string" },
            { name: "chainId", type: "uint256" },
            { name: "verifyingContract", type: "address" },
          ],
        },
      });
    });
  });

  describe("useNetwork", () => {
    it("should create a network-scoped account", async () => {
      const mockAccount = {
        address: mockAddress,
        name: "test-account",
        policies: [],
      };
      const mockEvmServerAccount = toEvmServerAccount(mockApiClient, {
        account: mockAccount,
      });

      const networkAccount = await mockEvmServerAccount.useNetwork("base");

      expect(networkAccount.network).toBe("base");
      expect(networkAccount.address).toBe(mockEvmServerAccount.address);
      expect(networkAccount.name).toBe(mockEvmServerAccount.name);
    });

    it("should support different networks", async () => {
      const mockAccount = {
        address: mockAddress,
        name: "test-account",
        policies: [],
      };
      const mockEvmServerAccount = toEvmServerAccount(mockApiClient, {
        account: mockAccount,
      });

      const baseAccount = await mockEvmServerAccount.useNetwork("base");
      const sepoliaAccount = await mockEvmServerAccount.useNetwork("base-sepolia");
      const customAccount = await mockEvmServerAccount.useNetwork("https://custom-rpc.example.com");

      expect(baseAccount.network).toBe("base");
      expect(sepoliaAccount.network).toBe("base-sepolia");
      expect(customAccount.network).toBe("https://custom-rpc.example.com");
    });
  });

  it("should call transfer action when transfer is called", async () => {
    const transferArgs: TransferOptions = {
      to: "0x9F663335Cd6Ad02a37B633602E98866CF944124d" as Address,
      amount: parseUnits("0.000001", 6),
      token: "usdc",
      network: "base-sepolia",
    };

    await serverAccount.transfer(transferArgs);

    expect(transfer).toHaveBeenCalledWith(
      mockApiClient,
      serverAccount,
      transferArgs,
      accountTransferStrategy,
    );
  });

  it("should call sendSwapTransaction when swap is called", async () => {
    const swapOptions = {
      network: "base" as const,
      toToken: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" as Address,
      fromToken: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2" as Address,
      fromAmount: BigInt("1000000000000000000"),
      taker: mockAddress,
    } as AccountSwapOptions;

    const result = await serverAccount.swap(swapOptions);

    expect(sendSwapTransaction).toHaveBeenCalledWith(mockApiClient, {
      ...swapOptions,
      address: mockAddress,
    });

    expect(result).toEqual({ transactionHash: "0xswaptransactionhash" });
  });

  it("should call sendSwapTransaction with pre-created swap quote", async () => {
    const mockSwapQuote = {
      liquidityAvailable: true as const,
      network: "base" as const,
      toToken: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" as Address,
      fromToken: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2" as Address,
      fromAmount: BigInt("1000000000000000000"),
      toAmount: BigInt("5000000000"),
      minToAmount: BigInt("4950000000"),
      blockNumber: BigInt("12345678"),
      fees: {
        gasFee: undefined,
        protocolFee: undefined,
      },
      issues: {
        allowance: undefined,
        balance: undefined,
        simulationIncomplete: false,
      },
      gas: BigInt("300000"),
      gasPrice: BigInt("1500000000"),
      transaction: {
        to: "0x000000000022D473030F116dDEE9F6B43aC78BA3" as Address,
        data: "0x12345678" as Hex,
        gas: BigInt("300000"),
        value: BigInt("0"),
        gasPrice: BigInt("1500000000"),
      },
      permit2: undefined,
      execute: vi.fn(),
    };

    const swapOptions = {
      swapQuote: mockSwapQuote,
    };

    const result = await serverAccount.swap(swapOptions);

    expect(sendSwapTransaction).toHaveBeenCalledWith(mockApiClient, {
      ...swapOptions,
      address: mockAddress,
      taker: mockAddress,
    });

    expect(result).toEqual({ transactionHash: "0xswaptransactionhash" });
  });

  it("should call createSwapQuote when quoteSwap is called", async () => {
    const quoteOptions = {
      network: "base" as const,
      fromToken: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2" as Address,
      toToken: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" as Address,
      fromAmount: BigInt("1000000000000000000"),
    };

    const result = await serverAccount.quoteSwap(quoteOptions);

    expect(createSwapQuote).toHaveBeenCalledWith(mockApiClient, {
      ...quoteOptions,
      taker: mockAddress,
    });

    expect(result).toEqual({
      liquidityAvailable: true,
      network: "base",
      toToken: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      fromToken: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
      fromAmount: BigInt("1000000000000000000"),
      toAmount: BigInt("5000000000"),
      minToAmount: BigInt("4950000000"),
      blockNumber: BigInt("12345678"),
      fees: {
        gasFee: undefined,
        protocolFee: undefined,
      },
      issues: {
        allowance: undefined,
        balance: undefined,
        simulationIncomplete: false,
      },
      gas: BigInt("300000"),
      gasPrice: BigInt("1500000000"),
      transaction: {
        to: "0x000000000022D473030F116dDEE9F6B43aC78BA3",
        data: "0x12345678",
        gas: "300000",
        value: "0",
      },
      permit2: undefined,
      execute: expect.any(Function),
    });
  });

  it("should call useSpendPermission action when useSpendPermission is called", async () => {
    await serverAccount.useSpendPermission({
      spendPermission: {
        account: mockAddress,
        spender: mockAddress,
        token: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
        allowance: parseUnits("0.000001", 6),
        period: 1000,
        start: 0,
        end: 1000,
        salt: 0n,
        extraData: "0x",
      },
      value: parseUnits("0.000001", 6),
      network: "base-sepolia",
    });

    expect(useSpendPermission).toHaveBeenCalledWith(mockApiClient, mockAddress, {
      spendPermission: {
        account: mockAddress,
        spender: mockAddress,
        token: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
        allowance: parseUnits("0.000001", 6),
        period: 1000,
        start: 0,
        end: 1000,
        salt: 0n,
        extraData: "0x",
      },
      value: parseUnits("0.000001", 6),
      network: "base-sepolia",
    });
  });
});
