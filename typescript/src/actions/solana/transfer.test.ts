import { describe, expect, it, vi, beforeEach } from "vitest";

import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import {
  getMint,
  getAssociatedTokenAddress,
  getAccount,
  createAssociatedTokenAccountInstruction,
  createTransferCheckedInstruction,
} from "@solana/spl-token";
import { transfer } from "./transfer.js";
import { CdpOpenApiClientType } from "../../openapi-client/index.js";
import { getOrCreateConnection, getConnectedNetwork } from "./utils.js";

const mockSerializedTransaction = "MOCK_SERIALIZED_TX_DATA";

vi.mock("@solana/web3.js", async () => {
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
    TransactionMessage: vi.fn().mockImplementation(() => ({
      compileToV0Message: vi.fn().mockReturnValue({
        serialize: vi.fn().mockReturnValue(Buffer.from("mockMessageData")),
      }),
    })),
    VersionedTransaction: vi.fn().mockImplementation(() => ({
      serialize: vi.fn().mockReturnValue(Buffer.from(mockSerializedTransaction)),
    })),
    MessageV0: {
      compile: vi.fn().mockReturnValue({
        serialize: vi.fn().mockReturnValue(Buffer.from("mockMessageData")),
      }),
    },
  };
});

vi.mock("@solana/spl-token", async () => {
  const actual = (await vi.importActual("@solana/web3.js")) as typeof import("@solana/web3.js");

  return {
    getMint: vi.fn().mockResolvedValue({ decimals: 6 }),
    getAssociatedTokenAddress: vi.fn().mockImplementation((mint, owner) => {
      // Generate deterministic but valid public keys for ATAs
      // The first ATA is for the sender, the second for the receiver
      return new actual.PublicKey(
        owner.toString() === "vYshzifUaxbTTMp8G6Tguw7RiXYfHhip8eQHjKU9g1j"
          ? "FG4Y3yX4AAchp1HvNZ7LfzFTewF2f6nDif3xQbTYzXXJ" // Source ATA
          : "EPxDogVYNTp3vbS8nHNXgZGqKiV6iB3yUBnxn5D31CXC", // Destination ATA
      );
    }),
    getAccount: vi.fn().mockResolvedValue({ amount: BigInt(100000000) }),
    createAssociatedTokenAccountInstruction: vi.fn().mockReturnValue({
      programId: new actual.PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
      keys: [],
      data: Buffer.from([]),
    }),
    createTransferCheckedInstruction: vi.fn().mockReturnValue({
      programId: new actual.PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
      keys: [],
      data: Buffer.from([]),
    }),
  };
});

vi.mock("./utils.js", async importActual => ({
  ...(await importActual<typeof import("./utils.js")>()),
  getOrCreateConnection: vi.fn(),
  getConnectedNetwork: vi.fn(),
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
      signSolanaTransaction: vi.fn().mockResolvedValue({
        signedTransaction: mockSerializedTransaction,
      }),
    } as unknown as CdpOpenApiClientType;

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
      expect(mockApiClient.signSolanaTransaction).toHaveBeenCalledTimes(1);
      expect(mockApiClient.signSolanaTransaction).toHaveBeenCalledWith(
        testFromAddress,
        expect.objectContaining({
          transaction: expect.any(String),
        }),
      );
      expect(connection.sendRawTransaction).toHaveBeenCalledTimes(1);
      expect(connection.sendRawTransaction).toHaveBeenCalledWith(
        expect.any(Uint8Array),
        expect.objectContaining({
          skipPreflight: false,
          maxRetries: 3,
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
      // Ensure devnet is used
      (getConnectedNetwork as any).mockResolvedValue("devnet");

      const result = await transfer(mockApiClient, {
        from: testFromAddress,
        to: testToAddress,
        amount: BigInt(10 * Math.pow(10, 6)), // 10 USDC
        token: "usdc",
        network: connection,
      });

      expect(result).toEqual({ signature: "mockSignature123" });
      expect(getMint).toHaveBeenCalledTimes(1);
      expect(getMint).toHaveBeenCalledWith(
        connection,
        new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"), // Devnet USDC
      );
      expect(getAssociatedTokenAddress).toHaveBeenCalledTimes(2);
      expect(getAccount).toHaveBeenCalledTimes(2);
      expect(createTransferCheckedInstruction).toHaveBeenCalledTimes(1);
      expect(mockApiClient.signSolanaTransaction).toHaveBeenCalledTimes(1);
      expect(connection.sendRawTransaction).toHaveBeenCalledTimes(1);
      expect(connection.sendRawTransaction).toHaveBeenCalledWith(
        expect.any(Uint8Array),
        expect.objectContaining({
          skipPreflight: false,
          maxRetries: 3,
        }),
      );
    });

    it("should transfer USDC successfully on mainnet", async () => {
      // Override to use mainnet for this test
      (getConnectedNetwork as any).mockResolvedValue("mainnet");

      const result = await transfer(mockApiClient, {
        from: testFromAddress,
        to: testToAddress,
        amount: BigInt(10 * Math.pow(10, 6)), // 10 USDC
        token: "usdc",
        network: connection,
      });

      expect(result).toEqual({ signature: "mockSignature123" });
      expect(getMint).toHaveBeenCalledTimes(1);
      expect(getMint).toHaveBeenCalledWith(
        connection,
        new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"), // Mainnet USDC
      );
    });

    it("should transfer custom SPL token successfully", async () => {
      // Use a valid Solana public key for the custom token
      const customMintAddress = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

      const result = await transfer(mockApiClient, {
        from: testFromAddress,
        to: testToAddress,
        amount: BigInt(0.0000000001 * Math.pow(10, 18)),
        token: customMintAddress,
        network: connection,
      });

      expect(result).toEqual({ signature: "mockSignature123" });
      expect(getMint).toHaveBeenCalledWith(connection, new PublicKey(customMintAddress));
    });

    it("should create destination ATA if it doesn't exist", async () => {
      // First mock is for checking source account balance
      (getAccount as any).mockResolvedValueOnce({ amount: BigInt(10000000) });

      // Second mock is for checking destination account - should throw to trigger ATA creation
      (getAccount as any).mockRejectedValueOnce(new Error("Account not found"));

      const result = await transfer(mockApiClient, {
        from: testFromAddress,
        to: testToAddress,
        amount: BigInt(10 * Math.pow(10, 6)), // 10 USDC
        token: "usdc",
        network: connection,
      });

      expect(result).toEqual({ signature: "mockSignature123" });
      expect(getAccount).toHaveBeenCalledTimes(2); // Should be called twice now
      expect(createAssociatedTokenAccountInstruction).toHaveBeenCalledTimes(1);
    });

    it("should throw error if source account has insufficient balance", async () => {
      // Mock mint with 6 decimals (USDC standard)
      (getMint as any).mockResolvedValueOnce({ decimals: 6 });

      // We're trying to transfer 10 USDC (10 * 10^6 = 10000000 units)
      // But we only have 1 unit in the account
      (getAccount as any).mockResolvedValueOnce({ amount: BigInt(1) });

      await expect(
        transfer(mockApiClient, {
          from: testFromAddress,
          to: testToAddress,
          amount: BigInt(10 * Math.pow(10, 6)), // 10 USDC
          token: "usdc",
          network: connection,
        }),
      ).rejects.toThrow("Insufficient token balance. Have 1, need 10000000");
    });

    it("should throw error if mint info fetch fails", async () => {
      // Mock getMint to throw an error
      (getMint as any).mockRejectedValueOnce(new Error("Mint not found"));

      await expect(
        transfer(mockApiClient, {
          from: testFromAddress,
          to: testToAddress,
          amount: BigInt(10 * Math.pow(10, 6)), // 10 USDC
          token: "usdc",
          network: connection,
        }),
      ).rejects.toThrow("Failed to fetch mint info");
    });
  });
});
