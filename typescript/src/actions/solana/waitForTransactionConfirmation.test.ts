import { describe, expect, it, vi, beforeEach } from "vitest";
import { Connection } from "@solana/web3.js";
import { waitForTransactionConfirmation } from "./waitForTransactionConfirmation.js";
import { getOrCreateConnection } from "./utils.js";

vi.mock("@solana/web3.js", async () => {
  const actual = (await vi.importActual("@solana/web3.js")) as typeof import("@solana/web3.js");
  return {
    ...actual,
    Connection: vi.fn().mockImplementation(() => ({
      getLatestBlockhash: vi.fn().mockResolvedValue({
        blockhash: "mockblockhash123",
        lastValidBlockHeight: 12345,
      }),
      confirmTransaction: vi.fn().mockResolvedValue({
        value: { err: null },
      }),
      rpcEndpoint: "https://api.devnet.solana.com",
    })),
  };
});

vi.mock("./utils.js", () => ({
  getOrCreateConnection: vi.fn(),
}));

describe("waitForTransactionConfirmation", () => {
  let connection: Connection;
  const testSignature = "mockSignature123";

  beforeEach(() => {
    vi.clearAllMocks();

    (getOrCreateConnection as any).mockImplementation(({ networkOrConnection }) => {
      return typeof networkOrConnection !== "string"
        ? networkOrConnection
        : new Connection("https://api.devnet.solana.com");
    });

    connection = new Connection("https://api.devnet.solana.com");
  });

  it("should confirm a transaction successfully", async () => {
    const result = await waitForTransactionConfirmation({
      signature: testSignature,
      network: connection,
    });

    expect(result).toEqual({ signature: testSignature });
    expect(connection.getLatestBlockhash).toHaveBeenCalledTimes(1);
    expect(connection.confirmTransaction).toHaveBeenCalledTimes(1);
    expect(connection.confirmTransaction).toHaveBeenCalledWith({
      signature: testSignature,
      blockhash: "mockblockhash123",
      lastValidBlockHeight: 12345,
    });
  });

  it("should create a connection if not provided", async () => {
    const result = await waitForTransactionConfirmation({
      signature: testSignature,
      network: "devnet",
    });

    expect(result).toEqual({ signature: testSignature });
    expect(getOrCreateConnection).toHaveBeenCalledTimes(1);
    expect(getOrCreateConnection).toHaveBeenCalledWith({
      networkOrConnection: "devnet",
    });
  });

  it("should throw an error if the transaction fails to confirm", async () => {
    (connection.confirmTransaction as any).mockResolvedValueOnce({
      value: { err: "Transaction simulation failed: Error processing Instruction 0" },
    });

    await expect(
      waitForTransactionConfirmation({
        signature: testSignature,
        network: connection,
      }),
    ).rejects.toThrow(
      "Transaction failed: Transaction simulation failed: Error processing Instruction 0",
    );
  });

  it("should forward any unexpected errors during confirmation", async () => {
    (connection.confirmTransaction as any).mockRejectedValueOnce(
      new Error("Connection error: timeout"),
    );

    await expect(
      waitForTransactionConfirmation({
        signature: testSignature,
        network: connection,
      }),
    ).rejects.toThrow("Connection error: timeout");
  });

  it("should throw an error if getLatestBlockhash fails", async () => {
    (connection.getLatestBlockhash as any).mockRejectedValueOnce(
      new Error("Failed to fetch blockhash"),
    );

    await expect(
      waitForTransactionConfirmation({
        signature: testSignature,
        network: connection,
      }),
    ).rejects.toThrow("Failed to fetch blockhash");
  });
});
