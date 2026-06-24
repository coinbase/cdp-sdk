import { describe, expect, it } from "vitest";

import { resolveNetworkFromChainId } from "./account-signers.js";

describe("resolveNetworkFromChainId", () => {
  it("resolves world mainnet and world sepolia chain IDs", () => {
    expect(resolveNetworkFromChainId(480)).toBe("world");
    expect(resolveNetworkFromChainId(4801)).toBe("world-sepolia");
  });
});
