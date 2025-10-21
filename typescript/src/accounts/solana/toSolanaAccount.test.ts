import { describe, it, expect, vi, beforeEach } from "vitest";
import { toSolanaAccount } from "./toSolanaAccount.js";
import { Account, SolanaAccount } from "./types.js";
import { CdpOpenApiClientType } from "../../openapi-client/index.js";
import { parseUnits } from "viem";

describe("toSolanaAccount", () => {
  let mockApiClient: CdpOpenApiClientType;
  let mockAccount: Account;
  let mockAddress: string;
  let solanaAccount: SolanaAccount;

  beforeEach(() => {
    mockAddress = "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM";

    mockApiClient = {
    } as unknown as CdpOpenApiClientType;

    mockAccount = {
      address: mockAddress,
      name: "test-solana-account",
      policies: [],
    };

    solanaAccount = toSolanaAccount(mockApiClient, {
      account: mockAccount,
    });
  });

  it("should create a Solana account with the correct structure", () => {
    const result = toSolanaAccount(mockApiClient, {
      account: mockAccount,
    });

    expect(result).toEqual({
      name: "test-solana-account",
      address: mockAddress,
      policies: [],
      requestFaucet: expect.any(Function),
      signMessage: expect.any(Function),
      signTransaction: expect.any(Function),
      sendTransaction: expect.any(Function),
      transfer: expect.any(Function),
    });
  });
});
