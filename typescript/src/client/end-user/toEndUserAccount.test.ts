import { describe, it, expect, vi, beforeEach } from "vitest";
import { toEndUserAccount } from "./toEndUserAccount.js";
import type {
  CdpOpenApiClientType,
  EndUser as OpenAPIEndUser,
} from "../../openapi-client/index.js";

vi.mock("../../analytics.js", () => ({
  Analytics: {
    trackAction: vi.fn(),
    trackError: vi.fn(),
  },
}));

describe("toEndUserAccount idempotencyKey forwarding", () => {
  let mockApiClient: Record<string, ReturnType<typeof vi.fn>>;
  let mockEndUser: OpenAPIEndUser;
  const userId = "test-user-id";
  const evmAddress = "0x1234567890abcdef1234567890abcdef12345678";
  const evmSmartAddress = "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd";
  const solanaAddress = "7EYnhQoR9YM3N7UoaKRoA44Uy8JeaZV3qyouov87awMs";

  beforeEach(() => {
    vi.clearAllMocks();

    mockApiClient = {
      addEndUserEvmAccount: vi.fn().mockResolvedValue({}),
      addEndUserEvmSmartAccount: vi.fn().mockResolvedValue({}),
      addEndUserSolanaAccount: vi.fn().mockResolvedValue({}),
      getDelegationForEndUser: vi.fn().mockResolvedValue({}),
      revokeDelegationForEndUser: vi.fn().mockResolvedValue(undefined),
      getDelegationForEndUserAccount: vi.fn().mockResolvedValue({}),
      revokeDelegationForEndUserAccount: vi.fn().mockResolvedValue(undefined),
      signEvmTransactionWithEndUserAccount: vi.fn().mockResolvedValue({}),
      signEvmMessageWithEndUserAccount: vi.fn().mockResolvedValue({}),
      signEvmTypedDataWithEndUserAccount: vi.fn().mockResolvedValue({}),
      sendEvmTransactionWithEndUserAccount: vi.fn().mockResolvedValue({}),
      sendEvmAssetWithEndUserAccount: vi.fn().mockResolvedValue({}),
      sendUserOperationWithEndUserAccount: vi.fn().mockResolvedValue({}),
      createEvmEip7702DelegationWithEndUserAccount: vi.fn().mockResolvedValue({}),
      signSolanaMessageWithEndUserAccount: vi.fn().mockResolvedValue({}),
      signSolanaTransactionWithEndUserAccount: vi.fn().mockResolvedValue({}),
      sendSolanaTransactionWithEndUserAccount: vi.fn().mockResolvedValue({}),
      sendSolanaAssetWithEndUserAccount: vi.fn().mockResolvedValue({}),
    };

    mockEndUser = {
      userId,
      authenticationMethods: [],
      mfaMethods: undefined,
      evmAccounts: [evmAddress],
      evmAccountObjects: [{ address: evmAddress }],
      evmSmartAccounts: [evmSmartAddress],
      evmSmartAccountObjects: [{ address: evmSmartAddress }],
      solanaAccounts: [solanaAddress],
      solanaAccountObjects: [{ address: solanaAddress }],
      createdAt: "2024-01-01T00:00:00Z",
    } as unknown as OpenAPIEndUser;
  });

  function createAccount() {
    return toEndUserAccount(mockApiClient as unknown as CdpOpenApiClientType, {
      endUser: mockEndUser,
    });
  }

  it("addEvmAccount forwards idempotencyKey as arg 3", async () => {
    const account = createAccount();
    await account.addEvmAccount("idem-evm");

    expect(mockApiClient.addEndUserEvmAccount).toHaveBeenCalledWith(userId, {}, "idem-evm");
  });

  it("addSolanaAccount forwards idempotencyKey as arg 3", async () => {
    const account = createAccount();
    await account.addSolanaAccount("idem-sol");

    expect(mockApiClient.addEndUserSolanaAccount).toHaveBeenCalledWith(userId, {}, "idem-sol");
  });

  it("addEvmSmartAccount forwards idempotencyKey as arg 3", async () => {
    const account = createAccount();
    await account.addEvmSmartAccount({
      enableSpendPermissions: true,
      idempotencyKey: "idem-smart",
    });

    expect(mockApiClient.addEndUserEvmSmartAccount).toHaveBeenCalledWith(
      userId,
      { enableSpendPermissions: true },
      "idem-smart",
    );
  });

  it("revokeDelegation forwards idempotencyKey as arg 4", async () => {
    const account = createAccount();
    await account.revokeDelegation("idem-revoke");

    expect(mockApiClient.revokeDelegationForEndUser).toHaveBeenCalledWith(
      userId,
      {},
      undefined,
      "idem-revoke",
    );
  });

  it("revokeDelegationForAccount forwards idempotencyKey as arg 5", async () => {
    const account = createAccount();
    await account.revokeDelegationForAccount({
      address: evmAddress,
      idempotencyKey: "idem-revoke-acct",
    });

    expect(mockApiClient.revokeDelegationForEndUserAccount).toHaveBeenCalledWith(
      userId,
      evmAddress,
      {},
      undefined,
      "idem-revoke-acct",
    );
  });

  it("signEvmTransaction forwards idempotencyKey as arg 4", async () => {
    const account = createAccount();
    const transaction = "0xdeadbeef";
    await account.signEvmTransaction({
      transaction,
      address: evmAddress,
      idempotencyKey: "idem-sign-tx",
    });

    expect(mockApiClient.signEvmTransactionWithEndUserAccount).toHaveBeenCalledWith(
      userId,
      { address: evmAddress, transaction },
      undefined,
      "idem-sign-tx",
    );
  });

  it("sendEvmAsset forwards idempotencyKey as arg 6", async () => {
    const account = createAccount();
    await account.sendEvmAsset({
      to: "0xrecipient",
      amount: "1.0",
      network: "base",
      address: evmAddress,
      asset: "eth",
      idempotencyKey: "idem-send-asset",
    });

    expect(mockApiClient.sendEvmAssetWithEndUserAccount).toHaveBeenCalledWith(
      userId,
      evmAddress,
      "eth",
      {
        to: "0xrecipient",
        amount: "1.0",
        network: "base",
        useCdpPaymaster: undefined,
        paymasterUrl: undefined,
      },
      undefined,
      "idem-send-asset",
    );
  });

  it("sendUserOperation forwards idempotencyKey as arg 5", async () => {
    const account = createAccount();
    const calls = [{ to: "0xtarget", data: "0x", value: "0" }];
    await account.sendUserOperation({
      network: "base",
      calls,
      address: evmSmartAddress,
      idempotencyKey: "idem-userop",
    });

    expect(mockApiClient.sendUserOperationWithEndUserAccount).toHaveBeenCalledWith(
      userId,
      evmSmartAddress,
      {
        network: "base",
        calls,
        useCdpPaymaster: undefined,
        paymasterUrl: undefined,
        dataSuffix: undefined,
      },
      undefined,
      "idem-userop",
    );
  });

  it("signSolanaMessage forwards idempotencyKey as arg 4", async () => {
    const account = createAccount();
    await account.signSolanaMessage({
      message: "hello solana",
      address: solanaAddress,
      idempotencyKey: "idem-sol-msg",
    });

    expect(mockApiClient.signSolanaMessageWithEndUserAccount).toHaveBeenCalledWith(
      userId,
      { address: solanaAddress, message: "hello solana" },
      undefined,
      "idem-sol-msg",
    );
  });

  it("sendSolanaAsset forwards idempotencyKey as arg 6", async () => {
    const account = createAccount();
    await account.sendSolanaAsset({
      to: "SoLRecipientAddr",
      amount: "2.5",
      network: "solana-mainnet",
      address: solanaAddress,
      asset: "sol",
      idempotencyKey: "idem-sol-asset",
    });

    expect(mockApiClient.sendSolanaAssetWithEndUserAccount).toHaveBeenCalledWith(
      userId,
      solanaAddress,
      "sol",
      {
        to: "SoLRecipientAddr",
        amount: "2.5",
        network: "solana-mainnet",
        createRecipientAta: undefined,
      },
      undefined,
      "idem-sol-asset",
    );
  });
});
