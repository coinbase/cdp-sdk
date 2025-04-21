import { describe, it, expect, vi, beforeEach, MockedFunction } from "vitest";

import { CdpOpenApiClient } from "../../openapi-client/index.js";

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
      expect(result).toEqual({ address: "cdpSolanaAccount" });
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
      expect(result).toEqual({ address: "cdpSolanaAccount" });
    });

    it("should get a Solana account by name", async () => {
      const getSolanaAccountByNameMock = CdpOpenApiClient.getSolanaAccountByName as MockedFunction<
        typeof CdpOpenApiClient.getSolanaAccountByName
      >;
      getSolanaAccountByNameMock.mockResolvedValue({
        address: "cdpSolanaAccount",
      });

      const result = await client.getAccount({ name: "cdpSolanaAccount" });
      expect(result).toEqual({ address: "cdpSolanaAccount" });
    });

    it("should throw an error if neither address nor name is provided", async () => {
      await expect(client.getAccount({})).rejects.toThrow(
        "Either address or name must be provided",
      );
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
      expect(result).toEqual({ accounts: [{ address: "cdpSolanaAccount" }] });
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
});
