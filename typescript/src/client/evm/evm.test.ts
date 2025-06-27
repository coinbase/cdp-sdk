import { describe, it, expect, vi, beforeEach, MockedFunction } from "vitest";
import { publicEncrypt, constants } from "crypto";

import {
  CdpOpenApiClient,
  EvmSmartAccount as OpenApiEvmSmartAccount,
  EvmUserOperation as OpenApiUserOperation,
  EvmCall as OpenApiEvmCall,
  GetSwapPriceResponse,
  CreateSwapQuoteResponse,
  SwapUnavailableResponse,
} from "../../openapi-client";
import { toEvmServerAccount } from "../../accounts/evm/toEvmServerAccount";
import { toEvmSmartAccount } from "../../accounts/evm/toEvmSmartAccount";
import { getSwapPrice } from "../../actions/evm/swap/getSwapPrice";
import { createSwapQuote } from "../../actions/evm/swap/createSwapQuote";
import { sendUserOperation } from "../../actions/evm/sendUserOperation";
import { waitForUserOperation } from "../../actions/evm/waitForUserOperation";
import type { EvmAccount, EvmServerAccount, EvmSmartAccount } from "../../accounts/evm/types.js";
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
  ImportServerAccountOptions,
  GetOrCreateSmartAccountOptions,
} from "./evm.types.js";
import { APIError } from "../../openapi-client/errors.js";
import { ImportAccountPublicRSAKey } from "../../constants.js";
import { decryptWithPrivateKey, generateExportEncryptionKeyPair } from "../../utils/export.js";

vi.mock("../../openapi-client", () => {
  return {
    CdpOpenApiClient: {
      createEvmAccount: vi.fn(),
      createEvmSmartAccount: vi.fn(),
      getEvmAccount: vi.fn(),
      getEvmAccountByName: vi.fn(),
      getEvmSmartAccount: vi.fn(),
      getEvmSmartAccountByName: vi.fn(),
      getUserOperation: vi.fn(),
      importEvmAccount: vi.fn(),
      exportEvmAccount: vi.fn(),
      exportEvmAccountByName: vi.fn(),
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
      signEvmTypedData: vi.fn(),
      updateEvmAccount: vi.fn(),
      getEvmSwapQuote: vi.fn(),
      createEvmSwap: vi.fn(),
      getEvmSwapPrice: vi.fn(),
    },
  };
});

vi.mock("../../accounts/evm/toEvmServerAccount", () => ({
  toEvmServerAccount: vi.fn(),
}));

vi.mock("../../accounts/evm/toEvmSmartAccount", () => ({
  toEvmSmartAccount: vi.fn(),
}));

vi.mock("../../actions/evm/swap/getSwapPrice", () => ({
  getSwapPrice: vi.fn(),
}));

vi.mock("../../actions/evm/swap/createSwapQuote", () => ({
  createSwapQuote: vi.fn(),
}));

vi.mock("../../actions/evm/sendUserOperation", () => ({
  sendUserOperation: vi.fn(),
}));

vi.mock("../../actions/evm/waitForUserOperation", () => ({
  waitForUserOperation: vi.fn(),
}));

vi.mock("../../utils/export", () => ({
  generateExportEncryptionKeyPair: vi.fn(),
  decryptWithPrivateKey: vi.fn(),
}));

vi.mock("crypto", () => {
  return {
    publicEncrypt: vi.fn(),
    constants: {
      RSA_PKCS1_OAEP_PADDING: 4,
    },
  };
});

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
        requestFaucet: vi.fn(),
        sendTransaction: vi.fn(),
        listTokenBalances: vi.fn(),
        quoteFund: vi.fn(),
        fund: vi.fn(),
        waitForFundOperationReceipt: vi.fn(),
        swap: vi.fn(),
        quoteSwap: vi.fn(),
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

    it("should create a server account with a policy", async () => {
      const policyId = "550e8400-e29b-41d4-a716-446655440000";
      const account = {
        address: "0x123",
        policies: [policyId],
      };
      const createOptions: CreateServerAccountOptions = {
        name: "test-account",
        accountPolicy: policyId,
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
        requestFaucet: vi.fn(),
        sendTransaction: vi.fn(),
        listTokenBalances: vi.fn(),
        quoteFund: vi.fn(),
        fund: vi.fn(),
        waitForFundOperationReceipt: vi.fn(),
        swap: vi.fn(),
        quoteSwap: vi.fn(),
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
          accountPolicy: createOptions.accountPolicy,
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

      const name = "test-smart-account";
      const createOptions = {
        owner: owner,
        name,
      };
      const openApiEvmSmartAccount: OpenApiEvmSmartAccount = {
        address: "0xabc",
        owners: [owner.address],
      };
      const smartAccount: EvmSmartAccount = {
        address: "0xabc" as Hex,
        owners: [owner],
        type: "evm-smart",
        name,
        transfer: vi.fn(),
        listTokenBalances: vi.fn(),
        sendUserOperation: vi.fn(),
        waitForUserOperation: vi.fn(),
        getUserOperation: vi.fn(),
        requestFaucet: vi.fn(),
        quoteFund: vi.fn(),
        fund: vi.fn(),
        waitForFundOperationReceipt: vi.fn(),
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
          name,
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
        requestFaucet: vi.fn(),
        sendTransaction: vi.fn(),
        listTokenBalances: vi.fn(),
        quoteFund: vi.fn(),
        fund: vi.fn(),
        waitForFundOperationReceipt: vi.fn(),
        swap: vi.fn(),
        quoteSwap: vi.fn(),
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
        requestFaucet: vi.fn(),
        sendTransaction: vi.fn(),
        listTokenBalances: vi.fn(),
        quoteFund: vi.fn(),
        fund: vi.fn(),
        waitForFundOperationReceipt: vi.fn(),
        swap: vi.fn(),
        quoteSwap: vi.fn(),
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
      const name = "test-smart-account";
      const openApiEvmSmartAccount: OpenApiEvmSmartAccount = {
        address: "0xabc",
        owners: [owner.address],
      };
      const getOptions: GetSmartAccountOptions = {
        address: "0xabc",
        owner,
        name,
      };
      const smartAccount: EvmSmartAccount = {
        address: "0xabc" as const,
        owners: [owner],
        type: "evm-smart" as const,
        name,
        transfer: vi.fn(),
        listTokenBalances: vi.fn(),
        sendUserOperation: vi.fn(),
        waitForUserOperation: vi.fn(),
        getUserOperation: vi.fn(),
        requestFaucet: vi.fn(),
        quoteFund: vi.fn(),
        fund: vi.fn(),
        waitForFundOperationReceipt: vi.fn(),
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
        requestFaucet: vi.fn(),
        sendTransaction: vi.fn(),
        listTokenBalances: vi.fn(),
        quoteFund: vi.fn(),
        fund: vi.fn(),
        waitForFundOperationReceipt: vi.fn(),
        swap: vi.fn(),
        quoteSwap: vi.fn(),
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

  describe("getOrCreateSmartAccount", () => {
    it("should return a smart account", async () => {
      const mockOwnerAccount: EvmAccount = {
        address: "0xowner" as Address,
        sign: vi.fn().mockResolvedValue("0xsignature" as Hex),
        signMessage: vi.fn().mockResolvedValue("0xsignature" as Hex),
        signTransaction: vi.fn().mockResolvedValue("0xsignature" as Hex),
        signTypedData: vi.fn().mockResolvedValue("0xsignature" as Hex),
      };

      const getOrCreateOptions: GetOrCreateSmartAccountOptions = {
        name: "test-smart-account",
        owner: mockOwnerAccount,
      };

      const mockOpenApiSmartAccount = {
        address: "0x456" as Address,
        owners: [mockOwnerAccount.address],
        name: "test-smart-account",
      };

      const mockSmartAccount: EvmSmartAccount = {
        address: "0x456" as Address,
        owners: [mockOwnerAccount],
        name: "test-smart-account",
        type: "evm-smart" as const,
        transfer: vi.fn(),
        sendUserOperation: vi.fn(),
        waitForUserOperation: vi.fn(),
        getUserOperation: vi.fn(),
        requestFaucet: vi.fn(),
        listTokenBalances: vi.fn(),
        quoteFund: vi.fn(),
        fund: vi.fn(),
        waitForFundOperationReceipt: vi.fn(),
      };

      const getEvmSmartAccountMock = CdpOpenApiClient.getEvmSmartAccountByName as MockedFunction<
        typeof CdpOpenApiClient.getEvmSmartAccountByName
      >;
      getEvmSmartAccountMock
        .mockRejectedValueOnce(new APIError(404, "not_found", "Account not found"))
        .mockResolvedValueOnce(mockOpenApiSmartAccount);

      const createEvmSmartAccountMock = CdpOpenApiClient.createEvmSmartAccount as MockedFunction<
        typeof CdpOpenApiClient.createEvmSmartAccount
      >;
      createEvmSmartAccountMock.mockResolvedValue(mockOpenApiSmartAccount);

      const toEvmSmartAccountMock = toEvmSmartAccount as MockedFunction<typeof toEvmSmartAccount>;
      toEvmSmartAccountMock.mockReturnValue(mockSmartAccount);

      const result = await client.getOrCreateSmartAccount(getOrCreateOptions);
      const result2 = await client.getOrCreateSmartAccount(getOrCreateOptions);
      expect(result).toBe(mockSmartAccount);
      expect(result2).toBe(mockSmartAccount);
      expect(getEvmSmartAccountMock).toHaveBeenCalledTimes(2);
      expect(createEvmSmartAccountMock).toHaveBeenCalledTimes(1);
      expect(toEvmSmartAccountMock).toHaveBeenCalledTimes(2);
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
        listTokenBalances: vi.fn(),
        sendUserOperation: vi.fn(),
        waitForUserOperation: vi.fn(),
        getUserOperation: vi.fn(),
        requestFaucet: vi.fn(),
        quoteFund: vi.fn(),
        fund: vi.fn(),
        waitForFundOperationReceipt: vi.fn(),
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
          requestFaucet: vi.fn(),
          sendTransaction: vi.fn(),
          listTokenBalances: vi.fn(),
          quoteFund: vi.fn(),
          fund: vi.fn(),
          waitForFundOperationReceipt: vi.fn(),
          swap: vi.fn(),
          quoteSwap: vi.fn(),
        },
        {
          address: "0x456",
          sign: vi.fn().mockResolvedValue("0xsignature"),
          signMessage: vi.fn().mockResolvedValue("0xsignature"),
          signTransaction: vi.fn().mockResolvedValue("0xsignature"),
          signTypedData: vi.fn().mockResolvedValue("0xsignature"),
          type: "evm-server",
          transfer: vi.fn(),
          requestFaucet: vi.fn(),
          sendTransaction: vi.fn(),
          listTokenBalances: vi.fn(),
          quoteFund: vi.fn(),
          fund: vi.fn(),
          waitForFundOperationReceipt: vi.fn(),
          swap: vi.fn(),
          quoteSwap: vi.fn(),
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
        listTokenBalances: vi.fn(),
        sendUserOperation: vi.fn(),
        waitForUserOperation: vi.fn(),
        getUserOperation: vi.fn(),
        requestFaucet: vi.fn(),
        quoteFund: vi.fn(),
        fund: vi.fn(),
        waitForFundOperationReceipt: vi.fn(),
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
        listTokenBalances: vi.fn(),
        sendUserOperation: vi.fn(),
        waitForUserOperation: vi.fn(),
        getUserOperation: vi.fn(),
        requestFaucet: vi.fn(),
        quoteFund: vi.fn(),
        fund: vi.fn(),
        waitForFundOperationReceipt: vi.fn(),
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

      expect(sendUserOperation).toHaveBeenCalledWith(CdpOpenApiClient, {
        smartAccount,
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

  describe("signTypedData", () => {
    it("should sign a typed data", async () => {
      const address = "0x789";
      const domain = {
        name: "EIP712Domain",
        chainId: 1,
        verifyingContract: "0x0000000000000000000000000000000000000000" as Hex,
      };
      const types = {
        EIP712Domain: [
          { name: "name", type: "string" },
          { name: "chainId", type: "uint256" },
          { name: "verifyingContract", type: "address" },
        ],
      };
      const primaryType = "EIP712Domain";
      const message = {
        name: "EIP712Domain",
        chainId: 1,
        verifyingContract: "0x0000000000000000000000000000000000000000" as Hex,
      };
      const signature = "0xsignature";

      const signTypedDataMock = CdpOpenApiClient.signEvmTypedData as MockedFunction<
        typeof CdpOpenApiClient.signEvmTypedData
      >;
      signTypedDataMock.mockResolvedValue({ signature });

      const result = await client.signTypedData({
        address,
        domain,
        types,
        primaryType,
        message,
      });

      expect(result).toEqual({ signature });
    });

    it("should infer EIP712Domain from domain", async () => {
      const address = "0x789";
      const domain = {
        name: "EIP712Domain",
        chainId: 1,
        verifyingContract: "0x0000000000000000000000000000000000000000" as Hex,
      };
      const types = {};
      const primaryType = "EIP712Domain";
      const message = {
        name: "EIP712Domain",
        chainId: 1,
        verifyingContract: "0x0000000000000000000000000000000000000000" as Hex,
      };
      const signature = "0xsignature";

      const signTypedDataMock = CdpOpenApiClient.signEvmTypedData as MockedFunction<
        typeof CdpOpenApiClient.signEvmTypedData
      >;
      signTypedDataMock.mockResolvedValue({ signature });

      await client.signTypedData({ address, domain, types, primaryType, message });

      expect(CdpOpenApiClient.signEvmTypedData).toHaveBeenCalledWith(
        address,
        {
          domain,
          types: {
            EIP712Domain: [
              { name: "name", type: "string" },
              { name: "chainId", type: "uint256" },
              { name: "verifyingContract", type: "address" },
            ],
          },
          primaryType,
          message,
        },
        undefined,
      );
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

    const clientAmount1 = { amount: BigInt(1000000000000000000), decimals: 18 };
    const clientAmount2 = { amount: BigInt(2000000000000000000), decimals: 18 };
    const clientAmount3 = { amount: BigInt(3000000000000000000), decimals: 18 };

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

  describe("updateEvmAccount", () => {
    it("should update an existing account", async () => {
      const address = "0x123456789abcdef";
      const updateData = {
        name: "Updated Account Name",
        accountPolicy: "550e8400-e29b-41d4-a716-446655440000",
      };
      const updatedAccount = {
        address,
        name: updateData.name,
        policies: [updateData.accountPolicy],
      };
      const serverAccount: EvmServerAccount = {
        address: address as Address,
        name: updateData.name,
        type: "evm-server",
        sign: vi.fn(),
        signMessage: vi.fn(),
        signTransaction: vi.fn(),
        signTypedData: vi.fn(),
        transfer: vi.fn(),
        listTokenBalances: vi.fn(),
        requestFaucet: vi.fn(),
        sendTransaction: vi.fn(),
        quoteFund: vi.fn(),
        fund: vi.fn(),
        waitForFundOperationReceipt: vi.fn(),
        policies: [updateData.accountPolicy],
        quoteSwap: vi.fn(),
        swap: vi.fn(),
      };

      const updateEvmAccountMock = CdpOpenApiClient.updateEvmAccount as MockedFunction<
        typeof CdpOpenApiClient.updateEvmAccount
      >;
      updateEvmAccountMock.mockResolvedValue(updatedAccount);

      const toEvmServerAccountMock = toEvmServerAccount as MockedFunction<
        typeof toEvmServerAccount
      >;
      toEvmServerAccountMock.mockReturnValue(serverAccount);

      const options = {
        address,
        update: updateData,
        idempotencyKey: "idem-key-12345",
      };

      const result = await client.updateAccount(options);

      expect(CdpOpenApiClient.updateEvmAccount).toHaveBeenCalledWith(
        address,
        updateData,
        "idem-key-12345",
      );
      expect(toEvmServerAccount).toHaveBeenCalledWith(CdpOpenApiClient, {
        account: updatedAccount,
      });
      expect(result).toBe(serverAccount);
    });

    it("should update an account without an idempotency key", async () => {
      const address = "0x987654321fedcba";
      const updateData = {
        name: "Another Updated Name",
      };
      const updatedAccount = {
        address,
        name: updateData.name,
      };
      const serverAccount: EvmServerAccount = {
        address: address as Address,
        name: updateData.name,
        type: "evm-server",
        sign: vi.fn(),
        signMessage: vi.fn(),
        signTransaction: vi.fn(),
        signTypedData: vi.fn(),
        transfer: vi.fn(),
        listTokenBalances: vi.fn(),
        requestFaucet: vi.fn(),
        sendTransaction: vi.fn(),
        quoteFund: vi.fn(),
        fund: vi.fn(),
        waitForFundOperationReceipt: vi.fn(),
        swap: vi.fn(),
        quoteSwap: vi.fn(),
      };

      const updateEvmAccountMock = CdpOpenApiClient.updateEvmAccount as MockedFunction<
        typeof CdpOpenApiClient.updateEvmAccount
      >;
      updateEvmAccountMock.mockResolvedValue(updatedAccount);

      const toEvmServerAccountMock = toEvmServerAccount as MockedFunction<
        typeof toEvmServerAccount
      >;
      toEvmServerAccountMock.mockReturnValue(serverAccount);

      const options = {
        address,
        update: updateData,
      };

      const result = await client.updateAccount(options);

      expect(CdpOpenApiClient.updateEvmAccount).toHaveBeenCalledWith(
        address,
        updateData,
        undefined,
      );
      expect(toEvmServerAccount).toHaveBeenCalledWith(CdpOpenApiClient, {
        account: updatedAccount,
      });
      expect(result).toBe(serverAccount);
    });
  });

  describe("importAccount", () => {
    it("should import a server account", async () => {
      const importOptions: ImportServerAccountOptions = {
        privateKey: "0x123456",
        name: "imported-account",
        idempotencyKey: "import-key",
      };
      const account = { address: "0x789" };
      const mockServerAccount: EvmServerAccount = {
        address: "0x789" as const,
        sign: vi.fn().mockResolvedValue("0xsignature"),
        signMessage: vi.fn().mockResolvedValue("0xsignature"),
        signTransaction: vi.fn().mockResolvedValue("0xsignature"),
        signTypedData: vi.fn().mockResolvedValue("0xsignature"),
        type: "evm-server" as const,
        transfer: vi.fn(),
        requestFaucet: vi.fn(),
        sendTransaction: vi.fn(),
        listTokenBalances: vi.fn(),
        quoteFund: vi.fn(),
        fund: vi.fn(),
        waitForFundOperationReceipt: vi.fn(),
        swap: vi.fn(),
        quoteSwap: vi.fn(),
      };

      const mockEncryptedKey = Buffer.from("encrypted-private-key");
      const publicEncryptMock = publicEncrypt as MockedFunction<typeof publicEncrypt>;
      publicEncryptMock.mockReturnValue(mockEncryptedKey);

      const importEvmAccountMock = CdpOpenApiClient.importEvmAccount as MockedFunction<
        typeof CdpOpenApiClient.importEvmAccount
      >;
      importEvmAccountMock.mockResolvedValue(account);

      const toEvmServerAccountMock = toEvmServerAccount as MockedFunction<
        typeof toEvmServerAccount
      >;
      toEvmServerAccountMock.mockReturnValue(mockServerAccount);

      const result = await client.importAccount(importOptions);

      expect(publicEncrypt).toHaveBeenCalledWith(
        {
          key: ImportAccountPublicRSAKey,
          padding: constants.RSA_PKCS1_OAEP_PADDING,
          oaepHash: "sha256",
        },
        Buffer.from("123456", "hex"),
      );

      expect(CdpOpenApiClient.importEvmAccount).toHaveBeenCalledWith(
        {
          name: importOptions.name,
          encryptedPrivateKey: mockEncryptedKey.toString("base64"),
        },
        importOptions.idempotencyKey,
      );

      expect(toEvmServerAccount).toHaveBeenCalledWith(CdpOpenApiClient, {
        account,
      });

      expect(result).toBe(mockServerAccount);
    });

    it("should import a server account with private key without 0x prefix", async () => {
      const importOptions: ImportServerAccountOptions = {
        privateKey: "abcdef1234567890" as Hex,
        name: "imported-account",
      };
      const account = { address: "0x789" };
      const mockServerAccount: EvmServerAccount = {
        address: "0x789" as const,
        sign: vi.fn(),
        signMessage: vi.fn(),
        signTransaction: vi.fn(),
        signTypedData: vi.fn(),
        type: "evm-server" as const,
        transfer: vi.fn(),
        requestFaucet: vi.fn(),
        sendTransaction: vi.fn(),
        listTokenBalances: vi.fn(),
        quoteFund: vi.fn(),
        fund: vi.fn(),
        waitForFundOperationReceipt: vi.fn(),
        swap: vi.fn(),
        quoteSwap: vi.fn(),
      };

      const mockEncryptedKey = Buffer.from("encrypted-private-key");
      const publicEncryptMock = publicEncrypt as MockedFunction<typeof publicEncrypt>;
      publicEncryptMock.mockReturnValue(mockEncryptedKey);

      const importEvmAccountMock = CdpOpenApiClient.importEvmAccount as MockedFunction<
        typeof CdpOpenApiClient.importEvmAccount
      >;
      importEvmAccountMock.mockResolvedValue(account);

      const toEvmServerAccountMock = toEvmServerAccount as MockedFunction<
        typeof toEvmServerAccount
      >;
      toEvmServerAccountMock.mockReturnValue(mockServerAccount);

      const result = await client.importAccount(importOptions);

      expect(publicEncrypt).toHaveBeenCalledWith(
        expect.any(Object),
        Buffer.from("abcdef1234567890", "hex"),
      );
      expect(result).toBe(mockServerAccount);
    });

    it("should throw error when private key is not valid hex", async () => {
      const importOptions: ImportServerAccountOptions = {
        privateKey: "0xnot-valid-hex!",
        name: "invalid-key-account",
      };

      await expect(client.importAccount(importOptions)).rejects.toThrow(
        "Private key must be a valid hexadecimal string",
      );

      // Verify the API wasn't called
      expect(CdpOpenApiClient.importEvmAccount).not.toHaveBeenCalled();
    });

    it("should throw error when private key is empty", async () => {
      const importOptions: ImportServerAccountOptions = {
        privateKey: "" as Hex,
        name: "empty-key-account",
      };

      await expect(client.importAccount(importOptions)).rejects.toThrow(
        "Private key must be a valid hexadecimal string",
      );

      // Verify the API wasn't called
      expect(CdpOpenApiClient.importEvmAccount).not.toHaveBeenCalled();
    });
  });

  describe("exportAccount", () => {
    it("should export an account by address", async () => {
      const testAddress = "0x789" as Address;
      const testPublicKey = Buffer.from("public-key").toString("base64");
      const testPrivateKey = Buffer.from("private-key").toString("base64");
      const testEncryptedPrivateKey = Buffer.from("encrypted-private-key").toString("base64");
      const testDecryptedPrivateKey = Buffer.from("decrypted-private-key").toString("hex");

      const generateExportEncryptionKeyPairMock = generateExportEncryptionKeyPair as MockedFunction<
        typeof generateExportEncryptionKeyPair
      >;
      generateExportEncryptionKeyPairMock.mockResolvedValue({
        publicKey: testPublicKey,
        privateKey: testPrivateKey,
      });

      const exportEvmAccountMock = CdpOpenApiClient.exportEvmAccount as MockedFunction<
        typeof CdpOpenApiClient.exportEvmAccount
      >;
      exportEvmAccountMock.mockResolvedValue({
        encryptedPrivateKey: testEncryptedPrivateKey,
      });

      const decryptWithPrivateKeyMock = decryptWithPrivateKey as MockedFunction<
        typeof decryptWithPrivateKey
      >;
      decryptWithPrivateKeyMock.mockReturnValue(testDecryptedPrivateKey);

      const exportedPrivateKey = await client.exportAccount({
        address: testAddress,
      });

      expect(exportedPrivateKey).toBe(testDecryptedPrivateKey);
      expect(generateExportEncryptionKeyPair).toHaveBeenCalled();
      expect(CdpOpenApiClient.exportEvmAccount).toHaveBeenCalledWith(
        testAddress,
        {
          exportEncryptionKey: testPublicKey,
        },
        undefined,
      );
      expect(decryptWithPrivateKey).toHaveBeenCalledWith(testPrivateKey, testEncryptedPrivateKey);
    });

    it("should export an account by name", async () => {
      const testName = "test-account";
      const testPublicKey = Buffer.from("public-key").toString("base64");
      const testPrivateKey = Buffer.from("private-key").toString("base64");
      const testEncryptedPrivateKey = Buffer.from("encrypted-private-key").toString("base64");
      const testDecryptedPrivateKey = Buffer.from("decrypted-private-key").toString("hex");

      const generateExportEncryptionKeyPairMock = generateExportEncryptionKeyPair as MockedFunction<
        typeof generateExportEncryptionKeyPair
      >;
      generateExportEncryptionKeyPairMock.mockResolvedValue({
        publicKey: testPublicKey,
        privateKey: testPrivateKey,
      });

      const exportEvmAccountByNameMock = CdpOpenApiClient.exportEvmAccountByName as MockedFunction<
        typeof CdpOpenApiClient.exportEvmAccountByName
      >;
      exportEvmAccountByNameMock.mockResolvedValue({
        encryptedPrivateKey: testEncryptedPrivateKey,
      });

      const decryptWithPrivateKeyMock = decryptWithPrivateKey as MockedFunction<
        typeof decryptWithPrivateKey
      >;
      decryptWithPrivateKeyMock.mockReturnValue(testDecryptedPrivateKey);

      const exportedPrivateKey = await client.exportAccount({
        name: testName,
      });

      expect(exportedPrivateKey).toBe(testDecryptedPrivateKey);
      expect(generateExportEncryptionKeyPair).toHaveBeenCalled();
      expect(CdpOpenApiClient.exportEvmAccountByName).toHaveBeenCalledWith(
        testName,
        {
          exportEncryptionKey: testPublicKey,
        },
        undefined,
      );
      expect(decryptWithPrivateKey).toHaveBeenCalledWith(testPrivateKey, testEncryptedPrivateKey);
    });

    it("should throw an error if neither address nor name is provided", async () => {
      await expect(client.exportAccount({})).rejects.toThrow(
        "Either address or name must be provided",
      );
    });
  });

  describe("getSwapPrice", () => {
    it("should get a swap price", async () => {
      const network = "ethereum";
      const toToken = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
      const fromToken = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
      const fromAmount = BigInt("1000000000000000000"); // 1 ETH in wei
      const taker = "0x1234567890123456789012345678901234567890";
      const gasPrice = BigInt("5000000000"); // 5 Gwei
      const slippageBps = 50; // 0.5%

      const mockResponse: GetSwapPriceResponse = {
        liquidityAvailable: true,
        blockNumber: "12345678",
        toAmount: "5000000000",
        toToken,
        fees: {
          gasFee: {
            amount: "1000000",
            token: fromToken,
          },
          protocolFee: {
            amount: "500000",
            token: fromToken,
          },
        },
        issues: {
          allowance: null,
          balance: null,
          simulationIncomplete: false,
        },
        minToAmount: "4950000000",
        fromAmount: "1000000000000000000",
        fromToken,
        gas: "150000",
        gasPrice: "5000000000",
      };

      const getSwapPriceMock = getSwapPrice as MockedFunction<typeof getSwapPrice>;
      getSwapPriceMock.mockResolvedValue(mockResponse);

      const result = await client.getSwapPrice({
        network,
        toToken,
        fromToken,
        fromAmount,
        taker,
        gasPrice,
        slippageBps,
      });

      expect(getSwapPrice).toHaveBeenCalledWith(CdpOpenApiClient, {
        network,
        toToken,
        fromToken,
        fromAmount,
        taker,
        gasPrice,
        slippageBps,
      });
      expect(result).toEqual(mockResponse);
    });

    it("should handle unavailable liquidity", async () => {
      const mockResponse: SwapUnavailableResponse = {
        liquidityAvailable: false,
      };

      const getSwapPriceMock = getSwapPrice as MockedFunction<typeof getSwapPrice>;
      getSwapPriceMock.mockResolvedValue(mockResponse);

      const result = await client.getSwapPrice({
        network: "ethereum",
        toToken: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
        fromToken: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
        fromAmount: BigInt("1000000000000000000"),
        taker: "0x1234567890123456789012345678901234567890",
      });

      expect(result.liquidityAvailable).toBe(false);
    });
  });

  describe("createSwapQuote", () => {
    it("should create a swap quote", async () => {
      const network = "ethereum";
      const toToken = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
      const fromToken = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
      const fromAmount = BigInt("1000000000000000000"); // 1 ETH in wei
      const taker = "0x1234567890123456789012345678901234567890";
      const slippageBps = 50; // 0.5%

      const mockResponse: CreateSwapQuoteResponse = {
        liquidityAvailable: true,
        blockNumber: "12345678",
        toAmount: "5000000000",
        toToken,
        fees: {
          gasFee: {
            amount: "1000000",
            token: fromToken,
          },
          protocolFee: {
            amount: "500000",
            token: fromToken,
          },
        },
        issues: {
          allowance: null,
          balance: null,
          simulationIncomplete: false,
        },
        minToAmount: "4950000000",
        fromAmount: "1000000000000000000",
        fromToken,
        permit2: null,
        transaction: {
          to: "0xRouterAddress",
          data: "0xTransactionData",
          gas: "250000",
          gasPrice: "20000000000",
          value: "0",
        },
      };

      const createSwapQuoteMock = createSwapQuote as MockedFunction<typeof createSwapQuote>;
      createSwapQuoteMock.mockResolvedValue(mockResponse);

      const result = await client.createSwapQuote({
        network,
        toToken,
        fromToken,
        fromAmount,
        taker,
        slippageBps,
      });

      expect(createSwapQuote).toHaveBeenCalledWith(CdpOpenApiClient, {
        network,
        toToken,
        fromToken,
        fromAmount,
        taker,
        slippageBps,
      });
      expect(result).toEqual(mockResponse);
    });

    it("should handle unavailable liquidity for createSwapQuote", async () => {
      const mockResponse: SwapUnavailableResponse = {
        liquidityAvailable: false,
      };

      const createSwapQuoteMock = createSwapQuote as MockedFunction<typeof createSwapQuote>;
      createSwapQuoteMock.mockResolvedValue(mockResponse);

      const result = await client.createSwapQuote({
        network: "ethereum",
        toToken: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
        fromToken: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
        fromAmount: BigInt("1000000000000000000"),
        taker: "0x1234567890123456789012345678901234567890",
      });

      expect(result.liquidityAvailable).toBe(false);
    });
  });
});
