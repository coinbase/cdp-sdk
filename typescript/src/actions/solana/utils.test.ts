import { describe, expect, it } from "vitest";
import { getConnectedNetwork, getOrCreateConnection } from "./utils.js";
import { Connection } from "@solana/web3.js";

describe("utils", () => {
  describe("getOrCreateConnection", () => {
    it("should create a connection with default RPC URL", () => {
      expect(getOrCreateConnection({ networkOrConnection: "devnet" }).rpcEndpoint).toBe(
        "https://api.devnet.solana.com",
      );

      expect(getOrCreateConnection({ networkOrConnection: "testnet" }).rpcEndpoint).toBe(
        "https://api.testnet.solana.com",
      );

      expect(getOrCreateConnection({ networkOrConnection: "mainnet" }).rpcEndpoint).toBe(
        "https://api.mainnet-beta.solana.com",
      );
    });

    it("should return the provided connection if provided", () => {
      const connection = new Connection("https://api.devnet.solana.com");
      expect(getOrCreateConnection({ networkOrConnection: connection })).toBe(connection);
    });
  });

  describe("getConnectedNetwork", () => {
    it("should return the correct network", async () => {
      // Mock Connection for devnet
      const mockDevnetConnection = {
        getGenesisHash: async () => "EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG", // Devnet genesis hash
      } as unknown as Connection;

      // Mock Connection for testnet
      const mockTestnetConnection = {
        getGenesisHash: async () => "4uhcVJyU9pJkvQyS88uRDiswHXSCkY3zQawwpjk2NsNY", // Testnet genesis hash
      } as unknown as Connection;

      // Mock Connection for mainnet
      const mockMainnetConnection = {
        getGenesisHash: async () => "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d", // Mainnet genesis hash
      } as unknown as Connection;

      expect(await getConnectedNetwork(mockDevnetConnection)).toBe("devnet");
      expect(await getConnectedNetwork(mockTestnetConnection)).toBe("testnet");
      expect(await getConnectedNetwork(mockMainnetConnection)).toBe("mainnet");
    });
  });
});
