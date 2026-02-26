import { describe, it, expect, vi, beforeEach } from "vitest";
import { toEvmDelegatedAccount } from "./toEvmDelegatedAccount.js";
import { toEvmServerAccount } from "./toEvmServerAccount.js";
import type { EvmServerAccount } from "./types.js";
import { CdpOpenApiClientType } from "../../openapi-client/index.js";
import type { Address } from "../../types/misc.js";

vi.mock("./toEvmSmartAccount.js", () => ({
  toEvmSmartAccount: vi
    .fn()
    .mockImplementation(
      (_apiClient: unknown, options: { smartAccount: unknown; owner: unknown }) => ({
        type: "evm-smart",
        address: (options.smartAccount as { address: string }).address,
        owners: [options.owner],
        sendUserOperation: vi.fn(),
      }),
    ),
}));

describe("toEvmDelegatedAccount", () => {
  let mockApiClient: CdpOpenApiClientType;
  let serverAccount: EvmServerAccount;

  beforeEach(async () => {
    mockApiClient = {} as CdpOpenApiClientType;
    const mockAccount = {
      address: "0x1234567890123456789012345678901234567890" as Address,
      sign: vi.fn(),
      signMessage: vi.fn(),
      signTransaction: vi.fn(),
      signTypedData: vi.fn(),
    };
    serverAccount = toEvmServerAccount(mockApiClient, { account: mockAccount });
  });

  it("should return an EvmSmartAccount with the same address as the server account", () => {
    const delegated = toEvmDelegatedAccount(serverAccount);

    expect(delegated.type).toBe("evm-smart");
    expect(delegated.address).toBe(serverAccount.address);
    expect(delegated.owners).toHaveLength(1);
    expect(delegated.owners[0]).toBe(serverAccount);
    expect(delegated.sendUserOperation).toBeDefined();
  });
});
