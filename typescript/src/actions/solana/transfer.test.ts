import { describe, expect, it, vi, beforeEach } from "vitest";

import { Connection, LAMPORTS_PER_SOL } from "@solana/web3.js";
import {
  fetchMint,
  fetchToken,
  findAssociatedTokenPda,
  getTransferCheckedInstruction,
  getCreateAssociatedTokenInstructionAsync,
} from "@solana-program/token";
import { getTransferSolInstruction } from "@solana-program/system";
import { transfer } from "./transfer.js";
import { CdpOpenApiClientType } from "../../openapi-client/index.js";
import { getOrCreateConnection, getConnectedNetwork } from "./utils.js";
import { sendTransaction } from "./sendTransaction.js";

vi.mock("@solana/web3.js", async () => {
  const mockSerializedTransaction = "MOCK_SERIALIZED_TX_DATA";
  const actual = (await vi.importActual("@solana/web3.js")) as typeof import("@solana/web3.js");
  return {
    ...actual,
    Connection: vi.fn().mockImplementation(() => ({
      getLatestBlockhash: vi.fn().mockResolvedValue({ blockhash: "mockblockhash123" }),
      sendRawTransaction: vi.fn().mockResolvedValue("mockSignature123"),
      rpcEndpoint: "https://api.devnet.solana.com",
      getGenesisHash: vi.fn().mockResolvedValue("EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG"),
    })),
    SystemProgram: {
      transfer: vi.fn().mockReturnValue({
        programId: new actual.PublicKey("11111111111111111111111111111111"),
        keys: [],
        data: Buffer.from([]),
      }),
    },
    Transaction: vi.fn().mockImplementation(() => ({
      add: vi.fn(),
      serialize: vi.fn().mockReturnValue(Buffer.from(mockSerializedTransaction)),
      recentBlockhash: "",
      feePayer: null,
    })),
  };
});

vi.mock("@solana/kit", () => ({
  pipe: vi.fn().mockImplementation((initialValue, ...fns) => {
    return fns.reduce((acc, fn) => fn(acc), initialValue);
  }),
  createTransactionMessage: vi.fn().mockReturnValue({}),
  setTransactionMessageLifetimeUsingBlockhash: vi.fn().mockReturnValue({}),
  appendTransactionMessageInstructions: vi.fn().mockReturnValue({}),
  address: vi.fn().mockImplementation(addr => addr),
  compileTransaction: vi.fn().mockReturnValue({
    messageBytes: new Uint8Array([1, 2, 3]),
    signatures: { mockSigner: null },
  }),
  setTransactionMessageFeePayer: vi.fn().mockReturnValue({}),
  createNoopSigner: vi.fn().mockReturnValue({}),
  getBase64EncodedWireTransaction: vi.fn().mockReturnValue("MOCK_SERIALIZED_TX_DATA"),
  createSolanaRpc: vi.fn().mockReturnValue({
    getLatestBlockhash: vi.fn().mockReturnValue({
      send: vi.fn().mockResolvedValue({
        value: { blockhash: "mockblockhash123", lastValidBlockHeight: 1000 },
      }),
    }),
  }),
}));

vi.mock("@solana-program/system", () => ({
  getTransferSolInstruction: vi.fn().mockReturnValue({
    programId: "11111111111111111111111111111111",
    keys: [],
    data: new Uint8Array([]),
  }),
}));

vi.mock("@solana-program/token", () => ({
  fetchMint: vi.fn().mockResolvedValue({ data: { decimals: 6 } }),
  findAssociatedTokenPda: vi
    .fn()
    .mockImplementation(() => ["FG4Y3yX4AAchp1HvNZ7LfzFTewF2f6nDif3xQbTYzXXJ", 255]),
  fetchToken: vi.fn().mockResolvedValue({ data: { amount: BigInt(100000000) } }),
  getCreateAssociatedTokenInstructionAsync: vi.fn().mockResolvedValue({
    programId: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
    keys: [],
    data: new Uint8Array([]),
  }),
  getTransferCheckedInstruction: vi.fn().mockReturnValue({
    programId: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
    keys: [],
    data: new Uint8Array([]),
  }),
  TOKEN_PROGRAM_ADDRESS: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
}));

vi.mock("./rpc.js", () => ({
  createRpcClient: vi.fn().mockReturnValue({
    getLatestBlockhash: vi.fn().mockReturnValue({
      send: vi.fn().mockResolvedValue({
        value: { blockhash: "mockblockhash123", lastValidBlockHeight: 1000 },
      }),
    }),
  }),
}));

vi.mock("./utils.js", async importActual => ({
  ...(await importActual<typeof import("./utils.js")>()),
  getOrCreateConnection: vi.fn(),
  getConnectedNetwork: vi.fn(),
}));

vi.mock("./sendTransaction.js", () => ({
  sendTransaction: vi.fn(),
}));

describe("transfer", () => {
  let mockApiClient: CdpOpenApiClientType;
  let connection: Connection;

  const testFromAddress = "vYshzifUaxbTTMp8G6Tguw7RiXYfHhip8eQHjKU9g1j";
  const testToAddress = "3KzDtddx4i53FBkvCzuDmRbaMozTZoJBb1TToWhz3JfE";

  beforeEach(() => {
    vi.clearAllMocks();

    (getOrCreateConnection as any).mockImplementation(({ networkOrConnection }) => {
      return typeof networkOrConnection !== "string"
        ? networkOrConnection
        : new Connection("https://api.devnet.solana.com");
    });
    (getConnectedNetwork as any).mockResolvedValue("devnet");

    mockApiClient = {
      sendSolanaTransaction: vi.fn().mockResolvedValue({
        transactionSignature: "mockSignature123",
      }),
    } as unknown as CdpOpenApiClientType;

    (sendTransaction as any).mockResolvedValue({ signature: "mockSignature123" });

    connection = new Connection("https://api.devnet.solana.com");
  });

  describe("SOL transfers", () => {
    it("should transfer SOL successfully", async () => {
      const result = await transfer(mockApiClient, {
        from: testFromAddress,
        to: testToAddress,
        amount: BigInt(1 * LAMPORTS_PER_SOL), // 1 SOL
        token: "sol",
        network: connection,
      });

      expect(result).toEqual({ signature: "mockSignature123" });

      expect(getTransferSolInstruction).toHaveBeenCalledTimes(1);
      expect(fetchMint).not.toHaveBeenCalled();
      expect(fetchToken).not.toHaveBeenCalled();

      expect(sendTransaction).toHaveBeenCalledTimes(1);
      expect(sendTransaction).toHaveBeenCalledWith(
        mockApiClient,
        expect.objectContaining({
          network: "solana-devnet",
          transaction: expect.any(String),
        }),
      );
    });

    it("should create a connection if not provided", async () => {
      const result = await transfer(mockApiClient, {
        from: testFromAddress,
        to: testToAddress,
        amount: BigInt(1 * LAMPORTS_PER_SOL),
        token: "sol",
        network: "devnet",
      });

      expect(result).toEqual({ signature: "mockSignature123" });
    });
  });

  describe("SPL token transfers", () => {
    it("should transfer USDC successfully on devnet", async () => {
      const result = await transfer(mockApiClient, {
        from: testFromAddress,
        to: testToAddress,
        amount: BigInt(10 * Math.pow(10, 6)), // 10 USDC
        token: "usdc",
        network: connection,
      });

      expect(result).toEqual({ signature: "mockSignature123" });

      expect(fetchMint).toHaveBeenCalledTimes(1);
      expect(findAssociatedTokenPda).toHaveBeenCalledTimes(2); // Source and destination ATAs
      expect(fetchToken).toHaveBeenCalledTimes(2); // Source balance check + destination existence check
      expect(getTransferCheckedInstruction).toHaveBeenCalledTimes(1);

      expect(sendTransaction).toHaveBeenCalledTimes(1);
      expect(sendTransaction).toHaveBeenCalledWith(
        mockApiClient,
        expect.objectContaining({
          network: "solana-devnet",
          transaction: expect.any(String),
        }),
      );
    });

    it("should transfer USDC successfully on mainnet", async () => {
      (getConnectedNetwork as any).mockResolvedValue("mainnet");

      const result = await transfer(mockApiClient, {
        from: testFromAddress,
        to: testToAddress,
        amount: BigInt(10 * Math.pow(10, 6)), // 10 USDC
        token: "usdc",
        network: connection,
      });

      expect(result).toEqual({ signature: "mockSignature123" });

      expect(fetchMint).toHaveBeenCalledTimes(1);
      expect(findAssociatedTokenPda).toHaveBeenCalledTimes(2);
      expect(fetchToken).toHaveBeenCalledTimes(2);
      expect(getTransferCheckedInstruction).toHaveBeenCalledTimes(1);

      expect(sendTransaction).toHaveBeenCalledWith(
        mockApiClient,
        expect.objectContaining({
          network: "solana",
          transaction: expect.any(String),
        }),
      );
    });

    it("should transfer custom SPL token successfully", async () => {
      const customMintAddress = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

      const result = await transfer(mockApiClient, {
        from: testFromAddress,
        to: testToAddress,
        amount: BigInt(0.0000000001 * Math.pow(10, 18)),
        token: customMintAddress,
        network: connection,
      });

      expect(result).toEqual({ signature: "mockSignature123" });

      expect(fetchMint).toHaveBeenCalledTimes(1);
      expect(findAssociatedTokenPda).toHaveBeenCalledTimes(2);
      expect(fetchToken).toHaveBeenCalledTimes(2);
      expect(getTransferCheckedInstruction).toHaveBeenCalledTimes(1);

      expect(sendTransaction).toHaveBeenCalledWith(
        mockApiClient,
        expect.objectContaining({
          network: "solana-devnet",
          transaction: expect.any(String),
        }),
      );
    });

    it("should create destination ATA if it doesn't exist", async () => {
      // First mock is for checking source account balance
      (fetchToken as any).mockResolvedValueOnce({ data: { amount: BigInt(10000000) } });

      // Second mock is for checking destination account - should throw to trigger ATA creation
      (fetchToken as any).mockRejectedValueOnce(new Error("Account not found"));

      const result = await transfer(mockApiClient, {
        from: testFromAddress,
        to: testToAddress,
        amount: BigInt(10 * Math.pow(10, 6)),
        token: "usdc",
        network: connection,
      });

      expect(result).toEqual({ signature: "mockSignature123" });

      expect(getCreateAssociatedTokenInstructionAsync).toHaveBeenCalledTimes(1);

      expect(sendTransaction).toHaveBeenCalledWith(
        mockApiClient,
        expect.objectContaining({
          network: "solana-devnet",
          transaction: expect.any(String),
        }),
      );
    });

    it("should throw error if source account has insufficient balance", async () => {
      (fetchToken as any).mockResolvedValueOnce({ data: { amount: BigInt(1) } });

      await expect(
        transfer(mockApiClient, {
          from: testFromAddress,
          to: testToAddress,
          amount: BigInt(10 * Math.pow(10, 6)),
          token: "usdc",
          network: connection,
        }),
      ).rejects.toThrow("Insufficient token balance: have 1, need 10000000");
    });

    it("should throw error if mint info fetch fails", async () => {
      (fetchMint as any).mockRejectedValueOnce(new Error("Mint not found"));

      await expect(
        transfer(mockApiClient, {
          from: testFromAddress,
          to: testToAddress,
          amount: BigInt(10 * Math.pow(10, 6)),
          token: "usdc",
          network: connection,
        }),
      ).rejects.toThrow("Mint not found");
    });
  });
});
