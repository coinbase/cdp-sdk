import { beforeEach, describe, expect, it, MockedFunction, vi } from "vitest";

import { CdpOpenApiClient } from "../../openapi-client/index.js";

import { APIError } from "../../openapi-client/errors.js";
import { SolanaClient } from "./solana.js";

vi.mock("../../openapi-client/index.js", () => {
  return {
    CdpOpenApiClient: {
      createSolanaAccount: vi.fn(),
      getSolanaAccount: vi.fn(),
      getSolanaAccountByName: vi.fn(),
      listSolanaAccounts: vi.fn(),
      requestSolanaFaucet: vi.fn(),
      signSolanaMessage: vi.fn(),
      signSolanaTransaction: vi.fn(),
      updateSolanaAccount: vi.fn(),
    },
  };
});

describe("SolanaClient", () => {
  let client: SolanaClient;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new SolanaClient();
  });

  describe("createAccount", () => {
    it("should create a Solana account", async () => {
      const createSolanaAccountMock = CdpOpenApiClient.createSolanaAccount as MockedFunction<
        typeof CdpOpenApiClient.createSolanaAccount
      >;
      createSolanaAccountMock.mockResolvedValue({
        address: "cdpSolanaAccount",
      });

      const result = await client.createAccount();
      expect(result).toEqual({
        address: "cdpSolanaAccount",
        requestFaucet: expect.any(Function),
        signMessage: expect.any(Function),
        signTransaction: expect.any(Function),
      });
    });
  });

  describe("getAccount", () => {
    it("should get a Solana account", async () => {
      const getSolanaAccountMock = CdpOpenApiClient.getSolanaAccount as MockedFunction<
        typeof CdpOpenApiClient.getSolanaAccount
      >;
      getSolanaAccountMock.mockResolvedValue({
        address: "cdpSolanaAccount",
      });

      const result = await client.getAccount({ address: "cdpSolanaAccount" });
      expect(result).toEqual({
        address: "cdpSolanaAccount",
        requestFaucet: expect.any(Function),
        signMessage: expect.any(Function),
        signTransaction: expect.any(Function),
      });
    });

    it("should get a Solana account by name", async () => {
      const getSolanaAccountByNameMock = CdpOpenApiClient.getSolanaAccountByName as MockedFunction<
        typeof CdpOpenApiClient.getSolanaAccountByName
      >;
      getSolanaAccountByNameMock.mockResolvedValue({
        address: "cdpSolanaAccount",
      });

      const result = await client.getAccount({ name: "cdpSolanaAccount" });
      expect(result).toEqual({
        address: "cdpSolanaAccount",
        requestFaucet: expect.any(Function),
        signMessage: expect.any(Function),
        signTransaction: expect.any(Function),
      });
    });

    it("should throw an error if neither address nor name is provided", async () => {
      await expect(client.getAccount({})).rejects.toThrow(
        "Either address or name must be provided",
      );
    });
  });

  describe("getOrCreateAccount", () => {
    it("should return a Solana account", async () => {
      const getSolanaAccountByNameMock = CdpOpenApiClient.getSolanaAccountByName as MockedFunction<
        typeof CdpOpenApiClient.getSolanaAccountByName
      >;
      getSolanaAccountByNameMock
        .mockRejectedValueOnce(new APIError(404, "not_found", "Account not found"))
        .mockResolvedValueOnce({
          address: "cdpSolanaAccount",
        });

      const createSolanaAccountMock = CdpOpenApiClient.createSolanaAccount as MockedFunction<
        typeof CdpOpenApiClient.createSolanaAccount
      >;
      createSolanaAccountMock.mockResolvedValue({
        address: "cdpSolanaAccount",
      });

      const result = await client.getOrCreateAccount({ name: "cdpSolanaAccount" });
      const result2 = await client.getOrCreateAccount({ name: "cdpSolanaAccount" });
      expect(result).toEqual({
        address: "cdpSolanaAccount",
        requestFaucet: expect.any(Function),
        signMessage: expect.any(Function),
        signTransaction: expect.any(Function),
      });
      expect(result2).toEqual({
        address: "cdpSolanaAccount",
        requestFaucet: expect.any(Function),
        signMessage: expect.any(Function),
        signTransaction: expect.any(Function),
      });
      expect(getSolanaAccountByNameMock).toHaveBeenCalledTimes(2);
      expect(createSolanaAccountMock).toHaveBeenCalledTimes(1);
    });
  });

  describe("listAccounts", () => {
    it("should list Solana accounts", async () => {
      const listSolanaAccountsMock = CdpOpenApiClient.listSolanaAccounts as MockedFunction<
        typeof CdpOpenApiClient.listSolanaAccounts
      >;
      listSolanaAccountsMock.mockResolvedValue({
        accounts: [{ address: "cdpSolanaAccount" }],
      });

      const result = await client.listAccounts();
      expect(result).toEqual({
        accounts: [
          {
            address: "cdpSolanaAccount",
            requestFaucet: expect.any(Function),
            signMessage: expect.any(Function),
            signTransaction: expect.any(Function),
          },
        ],
      });
    });
  });

  describe("requestFaucet", () => {
    it("should request a Solana faucet", async () => {
      const requestSolanaFaucetMock = CdpOpenApiClient.requestSolanaFaucet as MockedFunction<
        typeof CdpOpenApiClient.requestSolanaFaucet
      >;
      requestSolanaFaucetMock.mockResolvedValue({
        transactionSignature: "someTransactionSignature",
      });

      const result = await client.requestFaucet({
        address: "cdpSolanaAccount",
        token: "sol",
      });
      expect(result).toEqual({ signature: "someTransactionSignature" });
    });
  });

  describe("signMessage", () => {
    it("should sign a Solana message", async () => {
      const signSolanaMessageMock = CdpOpenApiClient.signSolanaMessage as MockedFunction<
        typeof CdpOpenApiClient.signSolanaMessage
      >;

      signSolanaMessageMock.mockResolvedValue({
        signature: "someSignature",
      });

      const result = await client.signMessage({
        address: "cdpSolanaAccount",
        message: "someMessage",
      });
      expect(result).toEqual({ signature: "someSignature" });
    });
  });

  describe("signTransaction", () => {
    it("should sign a Solana transaction", async () => {
      const signSolanaTransactionMock = CdpOpenApiClient.signSolanaTransaction as MockedFunction<
        typeof CdpOpenApiClient.signSolanaTransaction
      >;

      signSolanaTransactionMock.mockResolvedValue({
        signedTransaction: "someSignature",
      });

      const result = await client.signTransaction({
        address: "cdpSolanaAccount",
        transaction: "someTransaction",
      });
      expect(result).toEqual({ signature: "someSignature" });
    });
  });

  describe("Account Actions", () => {
    it("should request faucet funds", async () => {
      const requestSolanaFaucetMock = CdpOpenApiClient.requestSolanaFaucet as MockedFunction<
        typeof CdpOpenApiClient.requestSolanaFaucet
      >;
      requestSolanaFaucetMock.mockResolvedValue({
        transactionSignature: "someTransactionSignature",
      });

      const result = await client.requestFaucet({
        address: "cdpSolanaAccount",
        token: "sol",
      });
      expect(result).toEqual({ signature: "someTransactionSignature" });
    });

    it("should sign a Solana message", async () => {
      const signSolanaMessageMock = CdpOpenApiClient.signSolanaMessage as MockedFunction<
        typeof CdpOpenApiClient.signSolanaMessage
      >;

      signSolanaMessageMock.mockResolvedValue({
        signature: "someSignature",
      });

      const result = await client.signMessage({
        address: "cdpSolanaAccount",
        message: "someMessage",
      });
      expect(result).toEqual({ signature: "someSignature" });
    });

    it("should sign a Solana transaction", async () => {
      const signSolanaTransactionMock = CdpOpenApiClient.signSolanaTransaction as MockedFunction<
        typeof CdpOpenApiClient.signSolanaTransaction
      >;

      signSolanaTransactionMock.mockResolvedValue({
        signedTransaction: "someSignature",
      });

      const result = await client.signTransaction({
        address: "cdpSolanaAccount",
        transaction: "someTransaction",
      });
      expect(result).toEqual({ signature: "someSignature" });
    });
  });

  describe("updateAccount", () => {
    it("should update a Solana account with a new name", async () => {
      const updateSolanaAccountMock = CdpOpenApiClient.updateSolanaAccount as MockedFunction<
        typeof CdpOpenApiClient.updateSolanaAccount
      >;
      updateSolanaAccountMock.mockResolvedValue({
        address: "cdpSolanaAccount",
        name: "updatedAccountName",
      });

      const result = await client.updateAccount({
        address: "cdpSolanaAccount",
        update: {
          name: "updatedAccountName",
        },
      });

      expect(CdpOpenApiClient.updateSolanaAccount).toHaveBeenCalledWith(
        "cdpSolanaAccount",
        { name: "updatedAccountName" },
        undefined,
      );
      expect(result).toEqual({
        address: "cdpSolanaAccount",
        name: "updatedAccountName",
        requestFaucet: expect.any(Function),
        signMessage: expect.any(Function),
        signTransaction: expect.any(Function),
      });
    });

    it("should update a Solana account with an account policy", async () => {
      const updateSolanaAccountMock = CdpOpenApiClient.updateSolanaAccount as MockedFunction<
        typeof CdpOpenApiClient.updateSolanaAccount
      >;
      const policyId = "550e8400-e29b-41d4-a716-446655440000";
      updateSolanaAccountMock.mockResolvedValue({
        address: "cdpSolanaAccount",
        policies: [policyId],
      });

      const result = await client.updateAccount({
        address: "cdpSolanaAccount",
        update: {
          accountPolicy: policyId,
        },
      });

      expect(CdpOpenApiClient.updateSolanaAccount).toHaveBeenCalledWith(
        "cdpSolanaAccount",
        { accountPolicy: policyId },
        undefined,
      );
      expect(result).toEqual({
        address: "cdpSolanaAccount",
        requestFaucet: expect.any(Function),
        signMessage: expect.any(Function),
        signTransaction: expect.any(Function),
        policies: [policyId],
      });
    });

    it("should update a Solana account with an idempotency key", async () => {
      const updateSolanaAccountMock = CdpOpenApiClient.updateSolanaAccount as MockedFunction<
        typeof CdpOpenApiClient.updateSolanaAccount
      >;
      updateSolanaAccountMock.mockResolvedValue({
        address: "cdpSolanaAccount",
        name: "updatedWithIdempotencyKey",
      });

      const result = await client.updateAccount({
        address: "cdpSolanaAccount",
        update: {
          name: "updatedWithIdempotencyKey",
        },
        idempotencyKey: "unique-idem-key-12345",
      });

      expect(CdpOpenApiClient.updateSolanaAccount).toHaveBeenCalledWith(
        "cdpSolanaAccount",
        { name: "updatedWithIdempotencyKey" },
        "unique-idem-key-12345",
      );
      expect(result).toEqual({
        address: "cdpSolanaAccount",
        name: "updatedWithIdempotencyKey",
        requestFaucet: expect.any(Function),
        signMessage: expect.any(Function),
        signTransaction: expect.any(Function),
      });
    });
  });
});
