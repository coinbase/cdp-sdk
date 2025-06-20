import { describe, expect, it } from "vitest";

import { toNetworkScopedEvmSmartAccount } from "./toNetworkScopedEvmSmartAccount.js";
import type { CdpOpenApiClientType } from "../../openapi-client/index.js";
import { EvmAccount, EvmSmartAccount } from "./types.js";

describe("toNetworkScopedEvmSmartAccount", () => {
  it("should include network in the returned object", () => {
    const smartAccount = {
      address: "0x123",
      name: "test",
      owners: [],
      type: "evm-smart",
    } as unknown as EvmSmartAccount;

    const owner = {
      address: "0x456",
    } as unknown as EvmAccount;

    const apiClient = {} as unknown as CdpOpenApiClientType;

    const networkScopedSmartAccount = toNetworkScopedEvmSmartAccount(apiClient, {
      smartAccount,
      network: "base",
      owner,
    });

    expect(networkScopedSmartAccount.network).toBe("base");
  });
});
