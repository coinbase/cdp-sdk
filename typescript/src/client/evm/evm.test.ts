import { describe, it, expect, vi, beforeEach, MockedFunction } from "vitest";

import {
  CdpOpenApiClient,
  EvmSmartAccount as OpenApiEvmSmartAccount,
  EvmUserOperation as OpenApiUserOperation,
  EvmCall as OpenApiEvmCall,
} from "../../openapi-client";
import { toEvmServerAccount } from "../../accounts/evm/toEvmServerAccount";
import { toEvmSmartAccount } from "../../accounts/evm/toEvmSmartAccount";
import { sendUserOperation } from "../../actions/evm/sendUserOperation";
import { waitForUserOperation } from "../../actions/evm/waitForUserOperation";
import type { EvmAccount, EvmServerAccount, EvmSmartAccount } from "../../accounts/types";
import type { EvmUserOperationNetwork, ListEvmTokenBalancesNetwork } from "../../openapi-client";
import type { WaitOptions } from "../../utils/wait";
import { Address, Hex } from "../../types/misc";

import { EvmClient } from "./evm.js";
import {
  CreateServerAccountOptions,
  GetServerAccountOptions,
  GetSmartAccountOptions,
  ListServerAccountsOptions,
  ReadonlySmartAccount,
  UserOperation,
  WaitForUserOperationOptions,
  EvmCall,
  GetOrCreateServerAccountOptions,
} from "./evm.types.js";
import { APIError } from "../../openapi-client/errors.js";
vi.mock("../../openapi-client", () => {
  return {
    CdpOpenApiClient: {
      createEvmAccount: vi.fn(),
      createEvmSmartAccount: vi.fn(),
      getEvmAccount: vi.fn(),
      getEvmAccountByName: vi.fn(),
      getEvmSmartAccount: vi.fn(),
      getUserOperation: vi.fn(),
      listEvmAccounts: vi.fn(),
      listEvmSmartAccounts: vi.fn(),
      listEvmTokenBalances: vi.fn(),
      prepareUserOperation: vi.fn(),
      requestEvmFaucet: vi.fn(),
      sendEvmTransaction: vi.fn(),
      sendUserOperation: vi.fn(),
      signEvmHash: vi.fn(),
      signEvmMessage: vi.fn(),
      signEvmTransaction: vi.fn(),
    },
  };
});

vi.mock("../../accounts/evm/toEvmServerAccount", () => ({
  toEvmServerAccount: vi.fn(),
}));

vi.mock("../../accounts/evm/toEvmSmartAccount", () => ({
  toEvmSmartAccount: vi.fn(),
}));

vi.mock("../../actions/evm/sendUserOperation", () => ({
  sendUserOperation: vi.fn(),
}));

vi.mock("../../actions/evm/waitForUserOperation", () => ({
  waitForUserOperation: vi.fn(),
}));

describe("EvmClient", () => {
  let client: EvmClient;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new EvmClient();
  });

  describe("createAccount", () => {
    it("should create a server account", async () => {
      const account = { address: "0x123" };
      const createOptions: CreateServerAccountOptions = {
        name: "test-account",
        idempotencyKey: "test-key",
      };
      const mockServerAccount: EvmServerAccount = {
        address: "0x123" as const,
        sign: vi.fn().mockResolvedValue("0xsignature"),
        signMessage: vi.fn().mockResolvedValue("0xsignature"),
        signTransaction: vi.fn().mockResolvedValue("0xsignature"),
        signTypedData: vi.fn().mockResolvedValue("0xsignature"),
        type: "evm-server" as const,
        transfer: vi.fn(),
      };

      const createEvmAccountMock = CdpOpenApiClient.createEvmAccount as MockedFunction<
        typeof CdpOpenApiClient.createEvmAccount
      >;
      createEvmAccountMock.mockResolvedValue(account);

      const toEvmServerAccountMock = toEvmServerAccount as MockedFunction<
        typeof toEvmServerAccount
      >;
      toEvmServerAccountMock.mockReturnValue(mockServerAccount);

      const result = await client.createAccount(createOptions);

      expect(CdpOpenApiClient.createEvmAccount).toHaveBeenCalledWith(
        {
          name: createOptions.name,
        },
        createOptions.idempotencyKey,
      );
      expect(toEvmServerAccount).toHaveBeenCalledWith(CdpOpenApiClient, {
        account,
      });
      expect(result).toBe(mockServerAccount);
    });
  });

  describe("createSmartAccount", () => {
    it("should create a smart account", async () => {
      const owner: EvmAccount = {
        address: "0x789",
        sign: vi.fn().mockResolvedValue("0xsignature"),
        signMessage: vi.fn().mockResolvedValue("0xsignature"),
        signTransaction: vi.fn().mockResolvedValue("0xsignature"),
        signTypedData: vi.fn().mockResolvedValue("0xsignature"),
      };
      const createOptions = {
        owner: owner,
      };
      const openApiEvmSmartAccount: OpenApiEvmSmartAccount = {
        address: "0xabc",
        owners: [owner.address],
      };
      const smartAccount: EvmSmartAccount = {
        address: "0xabc" as Hex,
        owners: [owner],
        type: "evm-smart",
        transfer: vi.fn(),
      };

      const createEvmSmartAccountMock = CdpOpenApiClient.createEvmSmartAccount as MockedFunction<
        typeof CdpOpenApiClient.createEvmSmartAccount
      >;
      createEvmSmartAccountMock.mockResolvedValue(openApiEvmSmartAccount);

      const toEvmSmartAccountMock = toEvmSmartAccount as MockedFunction<typeof toEvmSmartAccount>;
      toEvmSmartAccountMock.mockReturnValue(smartAccount);

      const result = await client.createSmartAccount(createOptions);

      expect(CdpOpenApiClient.createEvmSmartAccount).toHaveBeenCalledWith(
        {
          owners: [owner.address],
        },
        undefined,
      );
      expect(toEvmSmartAccount).toHaveBeenCalledWith(CdpOpenApiClient, {
        smartAccount: openApiEvmSmartAccount,
        owner,
      });
      expect(result).toBe(smartAccount);
    });
  });

  describe("getAccount", () => {
    it("should return a server account", async () => {
      const account = { address: "0x123" };
      const getOptions: GetServerAccountOptions = {
        address: "0x123",
      };
      const mockServerAccount: EvmServerAccount = {
        address: "0x123",
        sign: vi.fn().mockResolvedValue("0xsignature"),
        signMessage: vi.fn().mockResolvedValue("0xsignature"),
        signTransaction: vi.fn().mockResolvedValue("0xsignature"),
        signTypedData: vi.fn().mockResolvedValue("0xsignature"),
        type: "evm-server",
        transfer: vi.fn(),
      };

      const getEvmAccountMock = CdpOpenApiClient.getEvmAccount as MockedFunction<
        typeof CdpOpenApiClient.getEvmAccount
      >;
      getEvmAccountMock.mockResolvedValue(account);

      const toEvmServerAccountMock = toEvmServerAccount as MockedFunction<
        typeof toEvmServerAccount
      >;
      toEvmServerAccountMock.mockReturnValue(mockServerAccount);

      const result = await client.getAccount(getOptions);

      expect(CdpOpenApiClient.getEvmAccount).toHaveBeenCalledWith(getOptions.address);
      expect(toEvmServerAccountMock).toHaveBeenCalledWith(CdpOpenApiClient, {
        account,
      });
      expect(result).toBe(mockServerAccount);
    });

    it("should return a server account by name", async () => {
      const account = { address: "0x123" };
      const getOptions: GetServerAccountOptions = {
        name: "test-account",
      };
      const mockServerAccount: EvmServerAccount = {
        address: "0x123",
        sign: vi.fn().mockResolvedValue("0xsignature"),
        signMessage: vi.fn().mockResolvedValue("0xsignature"),
        signTransaction: vi.fn().mockResolvedValue("0xsignature"),
        signTypedData: vi.fn().mockResolvedValue("0xsignature"),
        type: "evm-server",
        transfer: vi.fn(),
      };

      const getEvmAccountByNameMock = CdpOpenApiClient.getEvmAccountByName as MockedFunction<
        typeof CdpOpenApiClient.getEvmAccountByName
      >;
      getEvmAccountByNameMock.mockResolvedValue(account);

      const toEvmServerAccountMock = toEvmServerAccount as MockedFunction<
        typeof toEvmServerAccount
      >;
      toEvmServerAccountMock.mockReturnValue(mockServerAccount);

      const result = await client.getAccount(getOptions);
      expect(result).toBe(mockServerAccount);
    });

    it("should throw an error if neither address nor name is provided", async () => {
      const getOptions: GetServerAccountOptions = {};
      await expect(client.getAccount(getOptions)).rejects.toThrow(
        "Either address or name must be provided",
      );
    });
  });

  describe("getSmartAccount", () => {
    it("should return a smart account", async () => {
      const owner: EvmAccount = {
        address: "0x789",
        sign: vi.fn().mockResolvedValue("0xsignature"),
        signMessage: vi.fn().mockResolvedValue("0xsignature"),
        signTransaction: vi.fn().mockResolvedValue("0xsignature"),
        signTypedData: vi.fn().mockResolvedValue("0xsignature"),
      };
      const openApiEvmSmartAccount: OpenApiEvmSmartAccount = {
        address: "0xabc",
        owners: [owner.address],
      };
      const getOptions: GetSmartAccountOptions = {
        address: "0xabc",
        owner,
      };
      const smartAccount: EvmSmartAccount = {
        address: "0xabc" as const,
        owners: [owner],
        type: "evm-smart" as const,
        transfer: vi.fn(),
      };

      const getEvmSmartAccountMock = CdpOpenApiClient.getEvmSmartAccount as MockedFunction<
        typeof CdpOpenApiClient.getEvmSmartAccount
      >;
      getEvmSmartAccountMock.mockResolvedValue(openApiEvmSmartAccount);

      const toEvmSmartAccountMock = toEvmSmartAccount as MockedFunction<typeof toEvmSmartAccount>;
      toEvmSmartAccountMock.mockReturnValue(smartAccount);

      const result = await client.getSmartAccount(getOptions);

      expect(CdpOpenApiClient.getEvmSmartAccount).toHaveBeenCalledWith(getOptions.address);
      expect(toEvmSmartAccountMock).toHaveBeenCalledWith(CdpOpenApiClient, {
        smartAccount: openApiEvmSmartAccount,
        owner,
      });
      expect(result).toBe(smartAccount);
    });
  });

  describe("getOrCreateAccount", () => {
    it("should return a server account", async () => {
      const getOrCreateOptions: GetOrCreateServerAccountOptions = {
        name: "test-account",
      };
      const mockServerAccount: EvmServerAccount = {
        address: "0x123",
        sign: vi.fn().mockResolvedValue("0xsignature"),
        signMessage: vi.fn().mockResolvedValue("0xsignature"),
        signTransaction: vi.fn().mockResolvedValue("0xsignature"),
        signTypedData: vi.fn().mockResolvedValue("0xsignature"),
        type: "evm-server",
        transfer: vi.fn(),
      };

      const getEvmAccountMock = CdpOpenApiClient.getEvmAccountByName as MockedFunction<
        typeof CdpOpenApiClient.getEvmAccountByName
      >;
      getEvmAccountMock
        .mockRejectedValueOnce(new APIError(404, "not_found", "Account not found"))
        .mockResolvedValueOnce(mockServerAccount);

      const createEvmAccountMock = CdpOpenApiClient.createEvmAccount as MockedFunction<
        typeof CdpOpenApiClient.createEvmAccount
      >;
      createEvmAccountMock.mockResolvedValue(mockServerAccount);

      const toEvmServerAccountMock = toEvmServerAccount as MockedFunction<
        typeof toEvmServerAccount
      >;
      toEvmServerAccountMock.mockReturnValue(mockServerAccount);

      const result = await client.getOrCreateAccount(getOrCreateOptions);
      const result2 = await client.getOrCreateAccount(getOrCreateOptions);
      expect(result).toBe(mockServerAccount);
      expect(result2).toBe(mockServerAccount);
      expect(getEvmAccountMock).toHaveBeenCalledTimes(2);
      expect(createEvmAccountMock).toHaveBeenCalledTimes(1);
      expect(toEvmServerAccountMock).toHaveBeenCalledTimes(2);
    });
  });

  describe("getUserOperation", () => {
    it("should return a user operation", async () => {
      const smartAccount: EvmSmartAccount = {
        address: "0xabc",
        owners: [
          {
            address: "0x789",
            sign: vi.fn(),
            signMessage: vi.fn(),
            signTransaction: vi.fn(),
            signTypedData: vi.fn(),
          },
        ],
        type: "evm-smart",
        transfer: vi.fn(),
      };
      const userOpHash = "0xhash";
      const transactionHash = "0xtransactionhash" as Hex;

      const openApiUserOp: OpenApiUserOperation = {
        calls: [],
        network: "sepolia" as EvmUserOperationNetwork,
        status: "broadcast",
        transactionHash,
        userOpHash,
      };
      const userOp: UserOperation = {
        calls: [],
        network: "sepolia" as EvmUserOperationNetwork,
        status: "broadcast",
        transactionHash,
        userOpHash,
      };

      const getUserOperationMock = CdpOpenApiClient.getUserOperation as MockedFunction<
        typeof CdpOpenApiClient.getUserOperation
      >;
      getUserOperationMock.mockResolvedValue(openApiUserOp);

      const result = await client.getUserOperation({ smartAccount, userOpHash });
      expect(result).toStrictEqual(userOp);
    });
  });

  describe("listAccounts", () => {
    it("should list server accounts", async () => {
      const accounts = [{ address: "0x123" }, { address: "0x456" }];
      const listOptions: ListServerAccountsOptions = {};
      const serverAccounts: EvmServerAccount[] = [
        {
          address: "0x123",
          sign: vi.fn().mockResolvedValue("0xsignature"),
          signMessage: vi.fn().mockResolvedValue("0xsignature"),
          signTransaction: vi.fn().mockResolvedValue("0xsignature"),
          signTypedData: vi.fn().mockResolvedValue("0xsignature"),
          type: "evm-server",
          transfer: vi.fn(),
        },
        {
          address: "0x456",
          sign: vi.fn().mockResolvedValue("0xsignature"),
          signMessage: vi.fn().mockResolvedValue("0xsignature"),
          signTransaction: vi.fn().mockResolvedValue("0xsignature"),
          signTypedData: vi.fn().mockResolvedValue("0xsignature"),
          type: "evm-server",
          transfer: vi.fn(),
        },
      ];

      const listEvmAccountsMock = CdpOpenApiClient.listEvmAccounts as MockedFunction<
        typeof CdpOpenApiClient.listEvmAccounts
      >;
      listEvmAccountsMock.mockResolvedValue({
        accounts: accounts,
      });

      const toEvmServerAccountMock = toEvmServerAccount as MockedFunction<
        typeof toEvmServerAccount
      >;
      toEvmServerAccountMock
        .mockReturnValueOnce(serverAccounts[0])
        .mockReturnValueOnce(serverAccounts[1]);

      const result = await client.listAccounts(listOptions);

      expect(CdpOpenApiClient.listEvmAccounts).toHaveBeenCalledWith({
        pageSize: undefined,
        pageToken: undefined,
      });
      expect(toEvmServerAccount).toHaveBeenCalledTimes(2);
      expect(result).toEqual({
        accounts: serverAccounts,
        nextPageToken: undefined,
      });
    });
  });

  describe("listSmartAccounts", () => {
    it("should list smart accounts", async () => {
      const owner: EvmAccount = {
        address: "0x789",
        sign: vi.fn(),
        signMessage: vi.fn(),
        signTransaction: vi.fn(),
        signTypedData: vi.fn(),
      };
      const openApiEvmSmartAccounts: OpenApiEvmSmartAccount[] = [
        { address: "0x123", owners: [owner.address] },
        { address: "0x456", owners: [owner.address] },
      ];
      const smartAccounts: ReadonlySmartAccount[] = [
        { address: "0x123" as Address, owners: [owner.address], type: "evm-smart" },
        { address: "0x456" as Address, owners: [owner.address], type: "evm-smart" },
      ];
      const listEvmSmartAccountsMock = CdpOpenApiClient.listEvmSmartAccounts as MockedFunction<
        typeof CdpOpenApiClient.listEvmSmartAccounts
      >;
      listEvmSmartAccountsMock.mockResolvedValue({
        accounts: openApiEvmSmartAccounts,
      });

      const result = await client.listSmartAccounts();

      expect(CdpOpenApiClient.listEvmSmartAccounts).toHaveBeenCalledWith({
        name: undefined,
        pageSize: undefined,
        pageToken: undefined,
      });
      expect(result).toEqual({
        accounts: smartAccounts,
        nextPageToken: undefined,
      });
    });
  });

  describe("prepareUserOperation", () => {
    it("should prepare a user operation", async () => {
      const owner: EvmAccount = {
        address: "0x789",
        sign: vi.fn(),
        signMessage: vi.fn(),
        signTransaction: vi.fn(),
        signTypedData: vi.fn(),
      };
      const smartAccount: EvmSmartAccount = {
        address: "0xabc",
        owners: [owner],
        type: "evm-smart",
        transfer: vi.fn(),
      };

      const network = "sepolia" as EvmUserOperationNetwork;
      const openApiCalls: OpenApiEvmCall[] = [{ to: "0xdef", value: "1", data: "0x123" }];
      const calls: EvmCall[] = [{ to: "0xdef" as Address, value: BigInt(1), data: "0x123" as Hex }];
      const paymasterUrl = "https://paymaster.com";
      const userOpHash = "0xhash";

      const prepareUserOperationMock = CdpOpenApiClient.prepareUserOperation as MockedFunction<
        typeof CdpOpenApiClient.prepareUserOperation
      >;
      prepareUserOperationMock.mockResolvedValue({
        network,
        userOpHash,
        status: "broadcast",
        calls: openApiCalls,
      });

      const result = await client.prepareUserOperation({
        smartAccount,
        network,
        calls,
        paymasterUrl,
      });
      expect(result).toEqual({
        network,
        userOpHash,
        status: "broadcast",
        calls,
      });
    });
  });

  describe("requestFaucet", () => {
    it("should request funds from faucet and return the transaction hash", async () => {
      const address = "0x789";
      const network = "base-sepolia" as const;
      const token = "eth";
      const transactionHash = "0xhash";

      const requestFaucetMock = CdpOpenApiClient.requestEvmFaucet as MockedFunction<
        typeof CdpOpenApiClient.requestEvmFaucet
      >;
      requestFaucetMock.mockResolvedValue({ transactionHash });

      const result = await client.requestFaucet({ address, network, token });

      expect(result).toEqual({ transactionHash });
    });
  });

  describe("sendTransaction", () => {
    it("should send a serialized transaction", async () => {
      const address = "0x4252e0c9A3da5A2700e7d91cb50aEf522D0C6Fe8";
      const network = "base-sepolia" as const;
      const transaction = "0xtransactionserialized";
      const transactionHash = "0xhash";

      const sendEvmTransactionMock = CdpOpenApiClient.sendEvmTransaction as MockedFunction<
        typeof CdpOpenApiClient.sendEvmTransaction
      >;
      sendEvmTransactionMock.mockResolvedValue({ transactionHash });

      const result = await client.sendTransaction({ address, network, transaction });

      expect(result).toEqual({ transactionHash });
    });

    it("should handle an unserialized transaction", async () => {
      const address = "0x4252e0c9A3da5A2700e7d91cb50aEf522D0C6Fe8";
      const network = "base-sepolia" as const;
      const transaction = {
        to: "0x4252e0c9A3da5A2700e7d91cb50aEf522D0C6Fe8" as Address,
        value: 1n,
      };
      const transactionHash = "0xhash";

      const sendEvmTransactionMock = CdpOpenApiClient.sendEvmTransaction as MockedFunction<
        typeof CdpOpenApiClient.sendEvmTransaction
      >;
      sendEvmTransactionMock.mockResolvedValue({ transactionHash });

      const result = await client.sendTransaction({ address, network, transaction });

      expect(result).toEqual({ transactionHash });
    });
  });

  describe("sendUserOperation", () => {
    it("should send a user operation", async () => {
      const owner: EvmAccount = {
        address: "0x789",
        sign: vi.fn().mockResolvedValue("0xsignature"),
        signMessage: vi.fn().mockResolvedValue("0xsignature"),
        signTransaction: vi.fn().mockResolvedValue("0xsignature"),
        signTypedData: vi.fn().mockResolvedValue("0xsignature"),
      };

      const smartAccount: EvmSmartAccount = {
        address: "0xabc",
        owners: [owner],
        type: "evm-smart",
        transfer: vi.fn(),
      };

      const network = "sepolia" as EvmUserOperationNetwork;
      const calls = [{ to: "0xdef" as const, data: "0x123" as const }];
      const paymasterUrl = "https://paymaster.com";
      const userOpHash = "0xhash";

      const sendOptions = {
        smartAccount,
        network,
        calls,
        paymasterUrl,
      };

      const sendUserOperationMock = sendUserOperation as MockedFunction<typeof sendUserOperation>;
      sendUserOperationMock.mockResolvedValue({
        smartAccountAddress: smartAccount.address,
        status: "broadcast",
        userOpHash,
      });

      const result = await client.sendUserOperation(sendOptions);

      expect(sendUserOperation).toHaveBeenCalledWith(CdpOpenApiClient, smartAccount, {
        network,
        calls,
        paymasterUrl,
      });
      expect(result).toEqual({
        smartAccountAddress: smartAccount.address,
        status: "broadcast",
        userOpHash,
      });
    });
  });

  describe("signHash", () => {
    it("should sign a hash", async () => {
      const address = "0x789";
      const hash = "0xhash";
      const signature = "0xsignature";

      const signHashMock = CdpOpenApiClient.signEvmHash as MockedFunction<
        typeof CdpOpenApiClient.signEvmHash
      >;
      signHashMock.mockResolvedValue({ signature });

      const result = await client.signHash({ address, hash });

      expect(result).toEqual({ signature });
    });
  });

  describe("signMessage", () => {
    it("should sign a message", async () => {
      const address = "0x789";
      const message = "0xmessage";
      const signature = "0xsignature";

      const signMessageMock = CdpOpenApiClient.signEvmMessage as MockedFunction<
        typeof CdpOpenApiClient.signEvmMessage
      >;
      signMessageMock.mockResolvedValue({ signature });

      const result = await client.signMessage({ address, message });

      expect(result).toEqual({ signature });
    });
  });

  describe("signTransaction", () => {
    it("should sign a transaction", async () => {
      const address = "0x789";
      const transaction = "0xtransaction";
      const signature = "0xsignature";

      const signTransactionMock = CdpOpenApiClient.signEvmTransaction as MockedFunction<
        typeof CdpOpenApiClient.signEvmTransaction
      >;
      signTransactionMock.mockResolvedValue({ signedTransaction: signature });

      const result = await client.signTransaction({ address, transaction });

      expect(result).toEqual({ signature });
    });
  });

  describe("waitForUserOperation", () => {
    it("should wait for a user operation", async () => {
      const smartAccountAddress = "0xabc" as Address;
      const userOpHash = "0xhash" as Hex;
      const transactionReceipt = {
        smartAccountAddress,
        userOpHash,
        transactionHash: "0xtx" as Hex,
        status: "complete" as const,
      };

      const waitForUserOperationMock = waitForUserOperation as MockedFunction<
        typeof waitForUserOperation
      >;
      waitForUserOperationMock.mockResolvedValue(transactionReceipt);

      const waitOptions: WaitOptions = {
        intervalSeconds: 0.2,
        timeoutSeconds: 10,
      };
      const waitForUserOperationOptions: WaitForUserOperationOptions = {
        smartAccountAddress,
        userOpHash,
        waitOptions,
      };

      const result = await client.waitForUserOperation(waitForUserOperationOptions);

      expect(waitForUserOperation).toHaveBeenCalledWith(
        CdpOpenApiClient,
        waitForUserOperationOptions,
      );
      expect(result).toBe(transactionReceipt);
    });
  });

  describe("listTokenBalances", () => {
    const token1 = {
      network: "base-sepolia" as ListEvmTokenBalancesNetwork,
      contractAddress: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
    };
    const token2 = {
      network: "base-sepolia" as ListEvmTokenBalancesNetwork,
      contractAddress: "0x081827b8c3aa05287b5aa2bc3051fbe638f33152",
    };
    const token3 = {
      network: "base-sepolia" as ListEvmTokenBalancesNetwork,
      contractAddress: "0x061e3de6eae18bf86fccd22064e6613bc383c1c2",
    };

    const serverAmount1 = { amount: "1000000000000000000", decimals: 18 };
    const serverAmount2 = { amount: "2000000000000000000", decimals: 18 };
    const serverAmount3 = { amount: "3000000000000000000", decimals: 18 };

    const clientAmount1 = { amount: BigInt(1000000000000000000), decimals: BigInt(18) };
    const clientAmount2 = { amount: BigInt(2000000000000000000), decimals: BigInt(18) };
    const clientAmount3 = { amount: BigInt(3000000000000000000), decimals: BigInt(18) };

    const serverTokenBalance1 = { token: token1, amount: serverAmount1 };
    const serverTokenBalance2 = { token: token2, amount: serverAmount2 };
    const serverTokenBalance3 = { token: token3, amount: serverAmount3 };

    const clientTokenBalance1 = { token: token1, amount: clientAmount1 };
    const clientTokenBalance2 = { token: token2, amount: clientAmount2 };
    const clientTokenBalance3 = { token: token3, amount: clientAmount3 };

    const serverTokenBalances = [serverTokenBalance1, serverTokenBalance2, serverTokenBalance3];
    const clientTokenBalances = [clientTokenBalance1, clientTokenBalance2, clientTokenBalance3];

    it("should list token balances", async () => {
      const listEvmTokenBalancesMock = CdpOpenApiClient.listEvmTokenBalances as MockedFunction<
        typeof CdpOpenApiClient.listEvmTokenBalances
      >;
      listEvmTokenBalancesMock.mockResolvedValue({
        balances: serverTokenBalances,
      });

      const result = await client.listTokenBalances({
        address: "0xa12539f14e2fc01c4f9360deb0745528b3946048",
        network: "base-sepolia",
      });

      expect(CdpOpenApiClient.listEvmTokenBalances).toHaveBeenCalledWith(
        "base-sepolia",
        "0xa12539f14e2fc01c4f9360deb0745528b3946048",
        {
          pageSize: undefined,
          pageToken: undefined,
        },
      );
      expect(result).toEqual({
        balances: clientTokenBalances,
        nextPageToken: undefined,
      });
    });
  });
});
