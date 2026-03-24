import { describe, expect, it } from "vitest";
import { getConnectedNetwork, getOrCreateConnection, type SolanaRpcClient } from "./utils.js";

describe("utils", () => {
  describe("getOrCreateConnection", () => {
    it("should create an RPC client for devnet", () => {
      const rpc = getOrCreateConnection({ networkOrConnection: "devnet" });
      expect(typeof rpc.getLatestBlockhash).toBe("function");
    });

    it("should create an RPC client for mainnet", () => {
      const rpc = getOrCreateConnection({ networkOrConnection: "mainnet" });
      expect(typeof rpc.getLatestBlockhash).toBe("function");
    });

    it("should return the provided RPC client if provided", () => {
      const mockRpc = { getLatestBlockhash: () => {} } as unknown as SolanaRpcClient;
      expect(getOrCreateConnection({ networkOrConnection: mockRpc })).toBe(mockRpc);
    });
  });

  describe("getConnectedNetwork", () => {
    it("should return the correct network", async () => {
      const mockDevnetRpc = {
        getGenesisHash: () => ({
          send: async () => "EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG",
        }),
      } as unknown as SolanaRpcClient;

      const mockMainnetRpc = {
        getGenesisHash: () => ({
          send: async () => "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d",
        }),
      } as unknown as SolanaRpcClient;

      expect(await getConnectedNetwork(mockDevnetRpc)).toBe("devnet");
      expect(await getConnectedNetwork(mockMainnetRpc)).toBe("mainnet");
    });
  });
});
